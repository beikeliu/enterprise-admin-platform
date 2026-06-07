import { Controller, Get, Inject } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../../common/current-user';
import { RequirePermissions } from '../../common/permissions.decorator';
import { PrismaService } from '../../common/prisma.service';
import { ok } from '../../common/response';

@Controller('permissions')
export class PermissionController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get('my')
  my(@CurrentUser() user: RequestUser) {
    return ok({ permissions: user.permissions, roles: user.roles });
  }

  @RequirePermissions('system:role:view')
  @Get()
  async list() {
    const items = await this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
    return ok({
      items: items.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        resource: item.resource,
        action: item.action,
        description: item.description,
      })),
    });
  }
}
