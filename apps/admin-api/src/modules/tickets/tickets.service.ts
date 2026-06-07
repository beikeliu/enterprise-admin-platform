import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateTicketSchema, ReviewTicketSchema } from '@enterprise/api-contracts';
import { createTraceId } from '@enterprise/shared-utils';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../../common/prisma.service';
import { RequestUser } from '../../common/current-user';
import { AuditService } from '../audit/audit.service';
import { WorkflowService } from '../workflow/workflow.service';

type CreateTicketInput = z.infer<typeof CreateTicketSchema>;
type ReviewTicketInput = z.infer<typeof ReviewTicketSchema>;

@Injectable()
export class TicketsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(WorkflowService)
    private readonly workflow: WorkflowService,
    @Inject(AuditService)
    private readonly audit: AuditService,
  ) {}

  async list(user: RequestUser, query: { page: number; pageSize: number; keyword?: string }) {
    const where = {
      tenantId: user.tenantId,
      deletedAt: null,
      ...(query.keyword
        ? {
            OR: [
              { title: { contains: query.keyword } },
              { type: { contains: query.keyword } },
              { applicant: { displayName: { contains: query.keyword } } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: { applicant: true, department: true },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      items: items.map((ticket) => this.toTicketDto(ticket)),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async get(user: RequestUser, id: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: {
        applicant: true,
        department: true,
        comments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const workflow = ticket.workflowInstanceId
      ? await this.prisma.workflowInstance.findUnique({
          where: { id: ticket.workflowInstanceId },
          include: {
            tasks: true,
            records: { orderBy: { createdAt: 'asc' } },
          },
        })
      : null;

    const users = await this.prisma.user.findMany({
      where: { id: { in: ticket.comments.map((comment) => comment.authorId) } },
      select: { id: true, displayName: true, username: true },
    });
    const userById = new Map(users.map((item) => [item.id, item]));

    return {
      ...this.toTicketDto(ticket),
      comments: ticket.comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        authorName: userById.get(comment.authorId)?.displayName ?? userById.get(comment.authorId)?.username ?? '-',
      })),
      workflow,
    };
  }

  async create(user: RequestUser, input: CreateTicketInput) {
    const ticket = await this.prisma.ticket.create({
      data: {
        tenantId: user.tenantId,
        title: input.title,
        type: input.type,
        priority: input.priority,
        status: 'draft',
        applicantId: user.id,
        description: input.description,
        formData: input.formData as Prisma.InputJsonValue,
      },
      include: { applicant: true, department: true },
    });
    await this.audit.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'ticket.create',
      resource: 'ticket',
      resourceId: ticket.id,
      detail: { title: ticket.title },
      traceId: createTraceId(),
    });
    return this.toTicketDto(ticket);
  }

  async submit(user: RequestUser, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findFirst({
        where: { id, tenantId: user.tenantId, deletedAt: null },
      });
      if (!ticket) throw new NotFoundException('Ticket not found');
      if (ticket.status !== 'draft' && ticket.status !== 'rejected') {
        throw new BadRequestException('Only draft or rejected tickets can be submitted');
      }

      const instance = await this.workflow.startTicketWorkflow({
        tenantId: user.tenantId,
        ticketId: id,
        startedBy: user.id,
        tx,
      });
      const updated = await tx.ticket.update({
        where: { id },
        data: {
          status: 'approving',
          workflowInstanceId: instance.id,
          version: { increment: 1 },
        },
        include: { applicant: true, department: true },
      });
      await tx.auditLog.create({
        data: {
          tenantId: user.tenantId,
          actorId: user.id,
          action: 'ticket.submit',
          resource: 'ticket',
          resourceId: id,
          traceId: createTraceId(),
        },
      });
      return this.toTicketDto(updated);
    });
  }

  async review(user: RequestUser, id: string, action: 'approve' | 'reject', input: ReviewTicketInput) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findFirst({
        where: { id, tenantId: user.tenantId, deletedAt: null },
      });
      if (!ticket) throw new NotFoundException('Ticket not found');
      if (ticket.status !== 'approving') throw new BadRequestException('Ticket is not under approval');

      const workflowInstance = await this.workflow.completeTask({
        tenantId: user.tenantId,
        ticketId: id,
        operatorId: user.id,
        action,
        comment: input.comment,
        tx,
      });
      const nextStatus =
        action === 'reject' ? 'rejected' : workflowInstance.status === 'completed' ? 'approved' : 'approving';

      const updated = await tx.ticket.update({
        where: { id },
        data: {
          status: nextStatus,
          version: { increment: 1 },
        },
        include: { applicant: true, department: true },
      });
      await tx.auditLog.create({
        data: {
          tenantId: user.tenantId,
          actorId: user.id,
          action: `ticket.${action}`,
          resource: 'ticket',
          resourceId: id,
          detail: { comment: input.comment },
          traceId: createTraceId(),
        },
      });
      return this.toTicketDto(updated);
    });
  }

  async comment(user: RequestUser, id: string, input: { content: string }) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const comment = await this.prisma.ticketComment.create({
      data: {
        ticketId: ticket.id,
        authorId: user.id,
        content: input.content,
      },
    });
    await this.audit.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'ticket.comment',
      resource: 'ticket',
      resourceId: ticket.id,
      detail: { content: input.content },
      traceId: createTraceId(),
    });
    return { id: comment.id, content: comment.content, createdAt: comment.createdAt.toISOString() };
  }

  async withdraw(user: RequestUser, id: string, input: { comment?: string }) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findFirst({
        where: { id, tenantId: user.tenantId, deletedAt: null },
      });
      if (!ticket) throw new NotFoundException('Ticket not found');
      if (ticket.status !== 'approving') throw new BadRequestException('Only approving tickets can be withdrawn');
      if (ticket.applicantId !== user.id && !user.permissions.includes('ticket:ticket:approve')) {
        throw new BadRequestException('Only applicant or approver can withdraw this ticket');
      }
      await this.workflow.cancelTicketWorkflow({
        tenantId: user.tenantId,
        ticketId: id,
        operatorId: user.id,
        action: 'withdraw',
        comment: input.comment,
        tx,
      });
      const updated = await tx.ticket.update({
        where: { id },
        data: { status: 'draft', version: { increment: 1 } },
        include: { applicant: true, department: true },
      });
      await tx.auditLog.create({
        data: {
          tenantId: user.tenantId,
          actorId: user.id,
          action: 'ticket.withdraw',
          resource: 'ticket',
          resourceId: id,
          detail: { comment: input.comment },
          traceId: createTraceId(),
        },
      });
      return this.toTicketDto(updated);
    });
  }

  async close(user: RequestUser, id: string, input: { comment?: string }) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findFirst({
        where: { id, tenantId: user.tenantId, deletedAt: null },
      });
      if (!ticket) throw new NotFoundException('Ticket not found');
      if (ticket.status === 'closed' || ticket.status === 'cancelled') {
        throw new BadRequestException('Ticket is already finished');
      }
      if (ticket.status === 'approving') {
        await this.workflow.cancelTicketWorkflow({
          tenantId: user.tenantId,
          ticketId: id,
          operatorId: user.id,
          action: 'close',
          comment: input.comment,
          tx,
        });
      }
      const updated = await tx.ticket.update({
        where: { id },
        data: { status: 'closed', version: { increment: 1 } },
        include: { applicant: true, department: true },
      });
      await tx.auditLog.create({
        data: {
          tenantId: user.tenantId,
          actorId: user.id,
          action: 'ticket.close',
          resource: 'ticket',
          resourceId: id,
          detail: { comment: input.comment },
          traceId: createTraceId(),
        },
      });
      return this.toTicketDto(updated);
    });
  }

  private toTicketDto(ticket: {
    id: string;
    title: string;
    type: string;
    priority: string;
    status: string;
    applicantId: string;
    applicant?: { displayName: string };
    department?: { name: string } | null;
    description: string | null;
    formData: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: ticket.id,
      title: ticket.title,
      type: ticket.type,
      priority: ticket.priority,
      status: ticket.status,
      applicantId: ticket.applicantId,
      applicantName: ticket.applicant?.displayName ?? '-',
      departmentName: ticket.department?.name ?? null,
      description: ticket.description,
      formData: (ticket.formData ?? {}) as Record<string, unknown>,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    };
  }
}
