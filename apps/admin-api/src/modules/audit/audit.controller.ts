import { Controller, Get, Inject, Query } from '@nestjs/common';
import { PageQuerySchema } from '@enterprise/api-contracts';
import { CurrentUser, RequestUser } from '../../common/current-user';
import { RequirePermissions } from '../../common/permissions.decorator';
import { PrismaService } from '../../common/prisma.service';
import { ok } from '../../common/response';

@Controller('audit/logs')
export class AuditController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @RequirePermissions('audit:operation-log:view')
  @Get()
  async list(@CurrentUser() user: RequestUser, @Query() query: unknown) {
    const pageQuery = PageQuerySchema.parse(query);
    const where = {
      tenantId: user.tenantId,
      ...(pageQuery.keyword
        ? {
            OR: [
              { action: { contains: pageQuery.keyword } },
              { resource: { contains: pageQuery.keyword } },
              { resourceId: { contains: pageQuery.keyword } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (pageQuery.page - 1) * pageQuery.pageSize,
        take: pageQuery.pageSize,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { displayName: true, username: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return ok({
      items: items.map((item) => ({
        id: item.id,
        action: item.action,
        resource: item.resource,
        resourceId: item.resourceId,
        actorName: item.actor?.displayName ?? item.actor?.username ?? '-',
        detail: item.detail,
        traceId: item.traceId,
        createdAt: item.createdAt.toISOString(),
      })),
      page: pageQuery.page,
      pageSize: pageQuery.pageSize,
      total,
    });
  }
}
