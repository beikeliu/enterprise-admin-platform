import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, RequestUser } from '../../common/current-user';
import { RequirePermissions } from '../../common/permissions.decorator';
import { PrismaService } from '../../common/prisma.service';
import { ok } from '../../common/response';

const CreateNotificationSchema = z.object({
  title: z.string().min(2).max(128),
  content: z.string().min(1).max(1000),
  level: z.enum(['info', 'success', 'warning', 'error']).default('info'),
  userId: z.string().optional().nullable(),
});

@Controller('notifications')
export class NotificationsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @RequirePermissions('notification:message:view')
  @Get()
  async list(@CurrentUser() user: RequestUser) {
    const items = await this.prisma.notification.findMany({
      where: {
        tenantId: user.tenantId,
        OR: [{ userId: null }, { userId: user.id }],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return ok({
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        level: item.level,
        readAt: item.readAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  }

  @RequirePermissions('notification:message:create')
  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    const input = CreateNotificationSchema.parse(body);
    const notification = await this.prisma.notification.create({
      data: {
        tenantId: user.tenantId,
        userId: input.userId,
        title: input.title,
        content: input.content,
        level: input.level,
      },
    });
    return ok({ id: notification.id, title: notification.title });
  }

  @RequirePermissions('notification:message:view')
  @Patch(':id/read')
  async markRead(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const notification = await this.prisma.notification.findFirstOrThrow({
      where: {
        id,
        tenantId: user.tenantId,
        OR: [{ userId: null }, { userId: user.id }],
      },
    });
    const updated = await this.prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() },
    });
    return ok({ id: updated.id, readAt: updated.readAt?.toISOString() });
  }
}
