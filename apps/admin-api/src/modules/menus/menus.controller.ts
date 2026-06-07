import { Body, Controller, Get, Inject, Param, Patch } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, RequestUser } from '../../common/current-user';
import { RequirePermissions } from '../../common/permissions.decorator';
import { PrismaService } from '../../common/prisma.service';
import { ok } from '../../common/response';

const UpdateMenuSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  icon: z.string().max(64).nullable().optional(),
  permissionCode: z.string().max(128).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  visible: z.boolean().optional(),
  status: z.enum(['active', 'disabled']).optional(),
});

@Controller('menus')
export class MenusController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @RequirePermissions('system:menu:view')
  @Get()
  async list(@CurrentUser() user: RequestUser) {
    const items = await this.prisma.menu.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { sortOrder: 'asc' },
    });
    return ok({
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        routePath: item.routePath,
        icon: item.icon,
        permissionCode: item.permissionCode,
        sortOrder: item.sortOrder,
        visible: item.visible,
        status: item.status,
        updatedAt: item.updatedAt.toISOString(),
      })),
    });
  }

  @RequirePermissions('system:menu:update')
  @Patch(':id')
  async update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: unknown) {
    const input = UpdateMenuSchema.parse(body);
    const menu = await this.prisma.menu.findFirstOrThrow({ where: { id, tenantId: user.tenantId } });
    const updated = await this.prisma.menu.update({
      where: { id: menu.id },
      data: input,
    });
    return ok({
      id: updated.id,
      name: updated.name,
      visible: updated.visible,
      status: updated.status,
    });
  }
}
