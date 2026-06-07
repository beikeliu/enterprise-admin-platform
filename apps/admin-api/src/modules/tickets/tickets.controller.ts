import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import { CreateTicketSchema, PageQuerySchema, ReviewTicketSchema } from '@enterprise/api-contracts';
import { z } from 'zod';
import { CurrentUser, RequestUser } from '../../common/current-user';
import { RequirePermissions } from '../../common/permissions.decorator';
import { ok } from '../../common/response';
import { TicketsService } from './tickets.service';
import { WorkflowService } from '../workflow/workflow.service';

const TicketCommentSchema = z.object({ content: z.string().min(1).max(1000) });
const TicketActionSchema = z.object({ comment: z.string().max(1000).optional() });

@Controller()
export class TicketsController {
  constructor(
    @Inject(TicketsService)
    private readonly tickets: TicketsService,
    @Inject(WorkflowService)
    private readonly workflow: WorkflowService,
  ) {}

  @RequirePermissions('ticket:ticket:view')
  @Get('tickets')
  async list(@CurrentUser() user: RequestUser, @Query() query: unknown) {
    return ok(await this.tickets.list(user, PageQuerySchema.parse(query)));
  }

  @RequirePermissions('ticket:ticket:view')
  @Get('tickets/:id')
  async get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return ok(await this.tickets.get(user, id));
  }

  @RequirePermissions('ticket:ticket:create')
  @Post('tickets')
  async create(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return ok(await this.tickets.create(user, CreateTicketSchema.parse(body)));
  }

  @RequirePermissions('ticket:ticket:submit')
  @Post('tickets/:id/submit')
  async submit(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return ok(await this.tickets.submit(user, id));
  }

  @RequirePermissions('ticket:ticket:approve')
  @Post('tickets/:id/approve')
  async approve(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: unknown) {
    return ok(await this.tickets.review(user, id, 'approve', ReviewTicketSchema.parse(body)));
  }

  @RequirePermissions('ticket:ticket:reject')
  @Post('tickets/:id/reject')
  async reject(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: unknown) {
    return ok(await this.tickets.review(user, id, 'reject', ReviewTicketSchema.parse(body)));
  }

  @RequirePermissions('ticket:ticket:comment')
  @Post('tickets/:id/comments')
  async comment(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: unknown) {
    return ok(await this.tickets.comment(user, id, TicketCommentSchema.parse(body)));
  }

  @RequirePermissions('ticket:ticket:withdraw')
  @Post('tickets/:id/withdraw')
  async withdraw(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: unknown) {
    return ok(await this.tickets.withdraw(user, id, TicketActionSchema.parse(body)));
  }

  @RequirePermissions('ticket:ticket:close')
  @Post('tickets/:id/close')
  async close(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: unknown) {
    return ok(await this.tickets.close(user, id, TicketActionSchema.parse(body)));
  }

  @RequirePermissions('ticket:ticket:approve')
  @Get('workflow/tasks/my')
  async myTasks(@CurrentUser() user: RequestUser) {
    return ok(await this.workflow.myTasks({ tenantId: user.tenantId, assigneeId: user.id }));
  }

  @RequirePermissions('workflow:template:view')
  @Get('workflow/templates')
  async workflowTemplates(@CurrentUser() user: RequestUser) {
    return ok({ items: await this.workflow.templates({ tenantId: user.tenantId }) });
  }
}
