import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WorkflowInstance, WorkflowTask } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class WorkflowService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async startTicketWorkflow(input: {
    tenantId: string;
    ticketId: string;
    startedBy: string;
    tx?: Prisma.TransactionClient;
  }) {
    const db = input.tx ?? this.prisma;
    const template = await db.workflowTemplate.findFirst({
      where: {
        tenantId: input.tenantId,
        resourceType: 'ticket',
        status: 'published',
      },
      include: { nodes: { orderBy: { sortOrder: 'asc' } }, edges: true },
      orderBy: { version: 'desc' },
    });
    if (!template) throw new NotFoundException('No published ticket workflow template');

    const startTarget = template.edges.find((edge) => edge.sourceNodeKey === 'start')?.targetNodeKey;
    const firstNode =
      template.nodes.find((node) => node.nodeKey === startTarget && node.nodeType === 'approval') ??
      template.nodes.find((node) => node.nodeType === 'approval') ??
      template.nodes[0];
    if (!firstNode) throw new BadRequestException('Workflow template has no approval node');

    const assignees = await this.resolveAssignees(input.tenantId, firstNode.assigneeConfig, db);
    if (!assignees.length) throw new BadRequestException('Workflow node has no assignee');

    const instance = await db.workflowInstance.create({
      data: {
        tenantId: input.tenantId,
        templateId: template.id,
        resourceType: 'ticket',
        resourceId: input.ticketId,
        status: 'running',
        currentNodeKey: firstNode.nodeKey,
        startedBy: input.startedBy,
        records: {
          create: {
            action: 'submit',
            operatorId: input.startedBy,
            snapshot: { nodeKey: firstNode.nodeKey },
          },
        },
      },
    });

    await db.workflowTask.createMany({
      data: assignees.map((assigneeId) => ({
        instanceId: instance.id,
        nodeKey: firstNode.nodeKey,
        assigneeId,
      })),
    });

    return instance;
  }

  async completeTask(input: {
    tenantId: string;
    ticketId: string;
    operatorId: string;
    action: 'approve' | 'reject';
    comment?: string;
    tx?: Prisma.TransactionClient;
  }) {
    const db = input.tx ?? this.prisma;
    const instance = await db.workflowInstance.findFirst({
      where: {
        tenantId: input.tenantId,
        resourceType: 'ticket',
        resourceId: input.ticketId,
        status: 'running',
      },
      include: {
        template: {
          include: {
            nodes: { orderBy: { sortOrder: 'asc' } },
            edges: true,
          },
        },
      },
    });
    if (!instance) throw new NotFoundException('Running workflow instance not found');

    const task = await db.workflowTask.findFirst({
      where: {
        instanceId: instance.id,
        assigneeId: input.operatorId,
        status: 'pending',
      },
    });
    if (!task) throw new BadRequestException('No pending approval task for current user');

    await db.workflowTask.update({
      where: { id: task.id },
      data: {
        status: input.action === 'approve' ? 'approved' : 'rejected',
        completedAt: new Date(),
      },
    });

    await db.workflowRecord.create({
      data: {
        instanceId: instance.id,
        taskId: task.id,
        action: input.action,
        operatorId: input.operatorId,
        comment: input.comment,
      },
    });

    if (input.action === 'reject') {
      return db.workflowInstance.update({
        where: { id: instance.id },
        data: {
          status: 'rejected',
          completedAt: new Date(),
          currentNodeKey: null,
        },
      });
    }

    const nextNode = findNextApprovalNode(task.nodeKey, instance.template.nodes, instance.template.edges);
    if (!nextNode) {
      return db.workflowInstance.update({
        where: { id: instance.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          currentNodeKey: null,
        },
      });
    }

    const assignees = await this.resolveAssignees(input.tenantId, nextNode.assigneeConfig, db);
    if (!assignees.length) throw new BadRequestException('Workflow node has no assignee');

    await db.workflowTask.createMany({
      data: assignees.map((assigneeId) => ({
        instanceId: instance.id,
        nodeKey: nextNode.nodeKey,
        assigneeId,
      })),
    });

    return db.workflowInstance.update({
      where: { id: instance.id },
      data: {
        currentNodeKey: nextNode.nodeKey,
      },
    });
  }

  async myTasks(input: { tenantId: string; assigneeId: string }) {
    const tasks = await this.prisma.workflowTask.findMany({
      where: {
        assigneeId: input.assigneeId,
        status: 'pending',
        instance: { tenantId: input.tenantId, resourceType: 'ticket' },
      },
      include: { instance: true },
      orderBy: { createdAt: 'desc' },
    });

    const ticketIds = tasks.map((task) => task.instance.resourceId);
    const tickets = await this.prisma.ticket.findMany({
      where: { id: { in: ticketIds } },
      include: { applicant: true, department: true },
    });
    const ticketById = new Map(tickets.map((ticket) => [ticket.id, ticket]));

    return tasks.map((task) => ({
      id: task.id,
      nodeKey: task.nodeKey,
      createdAt: task.createdAt.toISOString(),
      ticket: ticketById.get(task.instance.resourceId),
    }));
  }

  async templates(input: { tenantId: string }) {
    const templates = await this.prisma.workflowTemplate.findMany({
      where: { tenantId: input.tenantId },
      include: {
        nodes: { orderBy: { sortOrder: 'asc' } },
        edges: true,
        _count: { select: { instances: true } },
      },
      orderBy: [{ resourceType: 'asc' }, { version: 'desc' }],
    });
    return templates.map((template) => ({
      id: template.id,
      name: template.name,
      code: template.code,
      resourceType: template.resourceType,
      version: template.version,
      status: template.status,
      nodeCount: template.nodes.length,
      edgeCount: template.edges.length,
      instanceCount: template._count.instances,
      nodes: template.nodes.map((node) => ({
        id: node.id,
        nodeKey: node.nodeKey,
        nodeType: node.nodeType,
        name: node.name,
        assigneeType: node.assigneeType,
        assigneeConfig: node.assigneeConfig,
      })),
      edges: template.edges.map((edge) => ({
        id: edge.id,
        sourceNodeKey: edge.sourceNodeKey,
        targetNodeKey: edge.targetNodeKey,
        conditionConfig: edge.conditionConfig,
      })),
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    }));
  }

  async cancelTicketWorkflow(input: {
    tenantId: string;
    ticketId: string;
    operatorId: string;
    action: 'withdraw' | 'close';
    comment?: string;
    tx?: Prisma.TransactionClient;
  }) {
    const db = input.tx ?? this.prisma;
    const instance = await db.workflowInstance.findFirst({
      where: {
        tenantId: input.tenantId,
        resourceType: 'ticket',
        resourceId: input.ticketId,
        status: 'running',
      },
    });
    if (!instance) return null;

    await db.workflowTask.updateMany({
      where: { instanceId: instance.id, status: 'pending' },
      data: { status: 'cancelled', completedAt: new Date() },
    });
    await db.workflowRecord.create({
      data: {
        instanceId: instance.id,
        action: input.action,
        operatorId: input.operatorId,
        comment: input.comment,
      },
    });
    return db.workflowInstance.update({
      where: { id: instance.id },
      data: { status: input.action === 'withdraw' ? 'withdrawn' : 'closed', completedAt: new Date(), currentNodeKey: null },
    });
  }

  private async resolveAssignees(
    tenantId: string,
    config: Prisma.JsonValue | null,
    db: Prisma.TransactionClient | PrismaService,
  ) {
    const roleCode =
      typeof config === 'object' && config && 'roleCode' in config ? String(config.roleCode) : 'admin';
    const users = await db.user.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: 'active',
        roles: { some: { role: { code: roleCode } } },
      },
      select: { id: true },
    });
    return users.map((user) => user.id);
  }
}

function findNextApprovalNode(
  currentNodeKey: string,
  nodes: Array<{ nodeKey: string; nodeType: string; sortOrder: number; assigneeConfig: Prisma.JsonValue }>,
  edges: Array<{ sourceNodeKey: string; targetNodeKey: string }>,
) {
  const nodeByKey = new Map(nodes.map((node) => [node.nodeKey, node]));
  let cursor = currentNodeKey;
  const visited = new Set<string>();
  while (!visited.has(cursor)) {
    visited.add(cursor);
    const edge = edges.find((item) => item.sourceNodeKey === cursor);
    if (!edge) return null;
    const nextNode = nodeByKey.get(edge.targetNodeKey);
    if (!nextNode || nextNode.nodeType === 'end') return null;
    if (nextNode.nodeType === 'approval') return nextNode;
    cursor = nextNode.nodeKey;
  }
  return null;
}
