import { Controller, Get, Inject } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../../common/current-user';
import { RequirePermissions } from '../../common/permissions.decorator';
import { PrismaService } from '../../common/prisma.service';
import { ok } from '../../common/response';

@Controller('system/monitor')
export class SystemMonitorController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @RequirePermissions('system:monitor:view')
  @Get()
  async overview(@CurrentUser() user: RequestUser) {
    const startedAt = new Date(Date.now() - process.uptime() * 1000);
    const memory = process.memoryUsage();
    const databaseStartedAt = Date.now();
    await this.prisma.$queryRaw`SELECT 1`;
    const databaseLatencyMs = Date.now() - databaseStartedAt;
    const [users, roles, menus, departments, tickets, auditLogs, notifications, files, recentAuditLogs] =
      await Promise.all([
        this.prisma.user.count({ where: { tenantId: user.tenantId, deletedAt: null } }),
        this.prisma.role.count({ where: { tenantId: user.tenantId, deletedAt: null } }),
        this.prisma.menu.count({ where: { tenantId: user.tenantId } }),
        this.prisma.department.count({ where: { tenantId: user.tenantId, deletedAt: null } }),
        this.prisma.ticket.count({ where: { tenantId: user.tenantId, deletedAt: null } }),
        this.prisma.auditLog.count({ where: { tenantId: user.tenantId } }),
        this.prisma.notification.count({ where: { tenantId: user.tenantId } }),
        this.prisma.fileAsset.count({ where: { tenantId: user.tenantId } }),
        this.prisma.auditLog.findMany({
          where: { tenantId: user.tenantId },
          orderBy: { createdAt: 'desc' },
          take: 8,
          include: { actor: { select: { displayName: true, username: true } } },
        }),
      ]);

    return ok({
      service: {
        status: 'healthy',
        nodeEnv: process.env.NODE_ENV ?? 'development',
        uptimeSeconds: Math.round(process.uptime()),
        startedAt: startedAt.toISOString(),
      },
      database: {
        status: 'healthy',
        latencyMs: databaseLatencyMs,
      },
      memory: {
        rss: memory.rss,
        heapTotal: memory.heapTotal,
        heapUsed: memory.heapUsed,
        external: memory.external,
      },
      modules: [
        { name: '用户', value: users },
        { name: '角色', value: roles },
        { name: '菜单', value: menus },
        { name: '部门', value: departments },
        { name: '工单', value: tickets },
        { name: '审计', value: auditLogs },
        { name: '通知', value: notifications },
        { name: '文件', value: files },
      ],
      recentAuditLogs: recentAuditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        actorName: log.actor?.displayName ?? log.actor?.username ?? '-',
        traceId: log.traceId,
        createdAt: log.createdAt.toISOString(),
      })),
    });
  }
}
