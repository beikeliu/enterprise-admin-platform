import { Controller, Get, Inject } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../../common/current-user';
import { RequirePermissions } from '../../common/permissions.decorator';
import { PrismaService } from '../../common/prisma.service';
import { ok } from '../../common/response';

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const lastDays = (days: number) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - index - 1));
    return toDateKey(date);
  });
};

@Controller('reports')
export class ReportsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @RequirePermissions('report:dashboard:view')
  @Get('operations')
  async operations(@CurrentUser() user: RequestUser) {
    const days = lastDays(14);
    const since = new Date(`${days[0]}T00:00:00.000Z`);
    const [ticketTotal, approvingTickets, approvedTickets, users, auditLogs, files, notifications] =
      await Promise.all([
        this.prisma.ticket.count({ where: { tenantId: user.tenantId, deletedAt: null } }),
        this.prisma.ticket.count({ where: { tenantId: user.tenantId, deletedAt: null, status: 'approving' } }),
        this.prisma.ticket.count({ where: { tenantId: user.tenantId, deletedAt: null, status: 'approved' } }),
        this.prisma.user.count({ where: { tenantId: user.tenantId, deletedAt: null } }),
        this.prisma.auditLog.count({ where: { tenantId: user.tenantId } }),
        this.prisma.fileAsset.count({ where: { tenantId: user.tenantId } }),
        this.prisma.notification.count({ where: { tenantId: user.tenantId } }),
      ]);
    const byStatus = await this.prisma.ticket.groupBy({
      by: ['status'],
      where: { tenantId: user.tenantId, deletedAt: null },
      _count: { _all: true },
    });
    const byPriority = await this.prisma.ticket.groupBy({
      by: ['priority'],
      where: { tenantId: user.tenantId, deletedAt: null },
      _count: { _all: true },
    });
    const trendTickets = await this.prisma.ticket.findMany({
      where: { tenantId: user.tenantId, deletedAt: null, createdAt: { gte: since } },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: 'asc' },
    });
    const trendAuditLogs = await this.prisma.auditLog.findMany({
      where: { tenantId: user.tenantId, createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const departmentGroups = await this.prisma.ticket.groupBy({
      by: ['departmentId'],
      where: { tenantId: user.tenantId, deletedAt: null, departmentId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { departmentId: 'desc' } },
      take: 8,
    });
    const applicantGroups = await this.prisma.ticket.groupBy({
      by: ['applicantId'],
      where: { tenantId: user.tenantId, deletedAt: null },
      _count: { _all: true },
      orderBy: { _count: { applicantId: 'desc' } },
      take: 8,
    });
    const [departments, applicants] = await Promise.all([
      this.prisma.department.findMany({
        where: { id: { in: departmentGroups.map((item) => item.departmentId).filter(Boolean) as string[] } },
        select: { id: true, name: true },
      }),
      this.prisma.user.findMany({
        where: { id: { in: applicantGroups.map((item) => item.applicantId) } },
        select: { id: true, displayName: true, username: true },
      }),
    ]);
    const departmentNameMap = new Map(departments.map((item) => [item.id, item.name]));
    const applicantNameMap = new Map(applicants.map((item) => [item.id, item.displayName || item.username]));
    const ticketTrendMap = new Map(days.map((day) => [day, { date: day, created: 0, approved: 0 }]));
    for (const ticket of trendTickets) {
      const key = toDateKey(ticket.createdAt);
      const row = ticketTrendMap.get(key);
      if (row) {
        row.created += 1;
        if (ticket.status === 'approved') row.approved += 1;
      }
    }
    const auditTrendMap = new Map(days.map((day) => [day, { date: day, count: 0 }]));
    for (const log of trendAuditLogs) {
      const row = auditTrendMap.get(toDateKey(log.createdAt));
      if (row) row.count += 1;
    }

    return ok({
      metrics: {
        ticketTotal,
        approvingTickets,
        approvedTickets,
        users,
        auditLogs,
        files,
        notifications,
      },
      ticketStatus: byStatus.map((item) => ({ name: item.status, value: item._count._all })),
      ticketPriority: byPriority.map((item) => ({ name: item.priority, value: item._count._all })),
      ticketTrend: Array.from(ticketTrendMap.values()).flatMap((item) => [
        { date: item.date, type: '新建工单', value: item.created },
        { date: item.date, type: '通过工单', value: item.approved },
      ]),
      auditTrend: Array.from(auditTrendMap.values()),
      departmentRanking: departmentGroups.map((item) => ({
        name: departmentNameMap.get(item.departmentId ?? '') ?? '未分配',
        value: item._count._all,
      })),
      applicantRanking: applicantGroups.map((item) => ({
        name: applicantNameMap.get(item.applicantId) ?? item.applicantId,
        value: item._count._all,
      })),
    });
  }
}
