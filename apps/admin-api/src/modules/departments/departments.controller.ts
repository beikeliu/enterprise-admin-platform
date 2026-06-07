import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, RequestUser } from '../../common/current-user';
import { RequirePermissions } from '../../common/permissions.decorator';
import { PrismaService } from '../../common/prisma.service';
import { ok } from '../../common/response';

const CreateDepartmentSchema = z.object({
  name: z.string().min(2).max(128),
  code: z.string().min(2).max(64).regex(/^[a-z][a-z0-9_-]*$/),
  parentId: z.string().optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
});

const UpdateDepartmentSchema = CreateDepartmentSchema.partial().extend({
  status: z.enum(['active', 'disabled']).optional(),
});

@Controller('departments')
export class DepartmentsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @RequirePermissions('system:department:view')
  @Get()
  async list(@CurrentUser() user: RequestUser) {
    const items = await this.prisma.department.findMany({
      where: { tenantId: user.tenantId, deletedAt: null },
      include: {
        _count: { select: { users: true, tickets: true } },
      },
      orderBy: [{ path: 'asc' }, { sortOrder: 'asc' }],
    });
    return ok({
      items: items.map((item) => ({
        id: item.id,
        parentId: item.parentId,
        name: item.name,
        code: item.code,
        path: item.path,
        sortOrder: item.sortOrder,
        status: item.status,
        userCount: item._count.users,
        ticketCount: item._count.tickets,
        updatedAt: item.updatedAt.toISOString(),
      })),
    });
  }

  @RequirePermissions('system:department:create')
  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    const input = CreateDepartmentSchema.parse(body);
    const parent = input.parentId
      ? await this.prisma.department.findFirstOrThrow({
          where: { id: input.parentId, tenantId: user.tenantId, deletedAt: null },
        })
      : null;
    const department = await this.prisma.department.create({
      data: {
        tenantId: user.tenantId,
        parentId: parent?.id,
        name: input.name,
        code: input.code,
        path: parent ? `${parent.path}/${input.code}` : `/${input.code}`,
        sortOrder: input.sortOrder,
      },
    });
    return ok({ id: department.id, name: department.name, code: department.code });
  }

  @RequirePermissions('system:department:update')
  @Patch(':id')
  async update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: unknown) {
    const input = UpdateDepartmentSchema.parse(body);
    const department = await this.prisma.department.findFirstOrThrow({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    const updated = await this.prisma.department.update({
      where: { id: department.id },
      data: {
        name: input.name,
        sortOrder: input.sortOrder,
        status: input.status,
      },
    });
    return ok({ id: updated.id, name: updated.name, status: updated.status });
  }
}
