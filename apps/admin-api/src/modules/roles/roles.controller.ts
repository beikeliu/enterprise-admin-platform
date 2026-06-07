import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { PageQuerySchema } from '@enterprise/api-contracts';
import { z } from 'zod';
import { CurrentUser, RequestUser } from '../../common/current-user';
import { RequirePermissions } from '../../common/permissions.decorator';
import { PrismaService } from '../../common/prisma.service';
import { ok } from '../../common/response';

const CreateRoleSchema = z.object({
  name: z.string().min(2).max(128),
  code: z.string().min(2).max(64).regex(/^[a-z][a-z0-9_-]*$/),
  description: z.string().max(500).optional(),
  permissionCodes: z.array(z.string()).default([]),
});

@Controller('roles')
export class RolesController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @RequirePermissions('system:role:view')
  @Get()
  async list(@CurrentUser() user: RequestUser, @Query() query: unknown) {
    const pageQuery = PageQuerySchema.parse(query);
    const where = {
      tenantId: user.tenantId,
      deletedAt: null,
      ...(pageQuery.keyword
        ? {
            OR: [{ name: { contains: pageQuery.keyword } }, { code: { contains: pageQuery.keyword } }],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        skip: (pageQuery.page - 1) * pageQuery.pageSize,
        take: pageQuery.pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          permissions: {
            include: { permission: true },
          },
          users: true,
        },
      }),
      this.prisma.role.count({ where }),
    ]);

    return ok({
      items: items.map((role) => ({
        id: role.id,
        name: role.name,
        code: role.code,
        description: role.description,
        status: role.status,
        userCount: role.users.length,
        permissions: role.permissions.map((item) => item.permission.code),
        createdAt: role.createdAt.toISOString(),
      })),
      page: pageQuery.page,
      pageSize: pageQuery.pageSize,
      total,
    });
  }

  @RequirePermissions('system:role:create')
  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    const input = CreateRoleSchema.parse(body);
    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: input.permissionCodes } },
      select: { id: true },
    });
    const role = await this.prisma.role.create({
      data: {
        tenantId: user.tenantId,
        name: input.name,
        code: input.code,
        description: input.description,
        permissions: {
          create: permissions.map((permission) => ({ permissionId: permission.id })),
        },
      },
      select: { id: true, name: true, code: true },
    });
    return ok(role);
  }

  @RequirePermissions('system:role:assign-permission')
  @Patch(':id/permissions')
  async assignPermissions(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { permissionCodes?: string[] },
  ) {
    const role = await this.prisma.role.findFirstOrThrow({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: body.permissionCodes ?? [] } },
      select: { id: true },
    });

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
      this.prisma.rolePermission.createMany({
        data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
        skipDuplicates: true,
      }),
    ]);

    return ok({ id: role.id, permissionCount: permissions.length });
  }
}
