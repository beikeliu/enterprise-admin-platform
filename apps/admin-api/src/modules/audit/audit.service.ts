import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AuditService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async record(input: {
    tenantId: string;
    actorId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    detail?: unknown;
    traceId: string;
  }) {
    await this.prisma.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        detail: input.detail as object,
        traceId: input.traceId,
      },
    });
  }
}
