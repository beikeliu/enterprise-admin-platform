import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { PageQuerySchema } from '@enterprise/api-contracts';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createTraceId } from '@enterprise/shared-utils';
import { CurrentUser, RequestUser } from '../../common/current-user';
import { RequirePermissions } from '../../common/permissions.decorator';
import { PrismaService } from '../../common/prisma.service';
import { ok } from '../../common/response';

const CreateUserSchema = z.object({
  username: z.string().min(2).max(64),
  displayName: z.string().min(2).max(128),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(32).optional().or(z.literal('')),
  password: z.string().min(6).max(64),
  roleIds: z.array(z.string()).default([]),
});

const UpdateUserStatusSchema = z.object({
  status: z.enum(['active', 'disabled']),
});

const AssignUserRolesSchema = z.object({
  roleIds: z.array(z.string()).default([]),
});

@Controller('users')
export class UsersController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @RequirePermissions('system:user:view')
  @Get()
  async list(@CurrentUser() currentUser: RequestUser, @Query() query: unknown) {
    const pageQuery = PageQuerySchema.parse(query);
    const where = {
      tenantId: currentUser.tenantId,
      deletedAt: null,
      ...(pageQuery.keyword
        ? {
            OR: [
              { username: { contains: pageQuery.keyword } },
              { displayName: { contains: pageQuery.keyword } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (pageQuery.page - 1) * pageQuery.pageSize,
        take: pageQuery.pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true,
          department: { select: { name: true } },
          roles: { include: { role: { select: { id: true, name: true, code: true } } } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return ok({
      items: items.map((item) => ({
        ...item,
        roles: item.roles.map((role) => role.role),
        createdAt: item.createdAt.toISOString(),
      })),
      page: pageQuery.page,
      pageSize: pageQuery.pageSize,
      total,
    });
  }

  @RequirePermissions('system:user:create')
  @Post()
  async create(@CurrentUser() currentUser: RequestUser, @Body() body: unknown) {
    const input = CreateUserSchema.parse(body);
    const user = await this.prisma.user.create({
      data: {
        tenantId: currentUser.tenantId,
        username: input.username,
        displayName: input.displayName,
        email: input.email || null,
        phone: input.phone || null,
        passwordHash: await bcrypt.hash(input.password, 10),
        roles: {
          create: input.roleIds.map((roleId) => ({ roleId })),
        },
      },
      select: { id: true, username: true, displayName: true, status: true },
    });
    await this.prisma.auditLog.create({
      data: {
        tenantId: currentUser.tenantId,
        actorId: currentUser.id,
        action: 'user.create',
        resource: 'user',
        resourceId: user.id,
        detail: { username: user.username },
        traceId: createTraceId(),
      },
    });
    return ok(user);
  }

  @RequirePermissions('system:user:update')
  @Patch(':id/status')
  async updateStatus(@CurrentUser() currentUser: RequestUser, @Param('id') id: string, @Body() body: unknown) {
    const input = UpdateUserStatusSchema.parse(body);
    const target = await this.prisma.user.findFirstOrThrow({
      where: { id, tenantId: currentUser.tenantId, deletedAt: null },
      select: { id: true },
    });
    const user = await this.prisma.user.update({
      where: { id: target.id },
      data: { status: input.status, version: { increment: 1 } },
      select: { id: true, username: true, status: true },
    });
    await this.prisma.auditLog.create({
      data: {
        tenantId: currentUser.tenantId,
        actorId: currentUser.id,
        action: `user.${input.status}`,
        resource: 'user',
        resourceId: user.id,
        detail: { username: user.username },
        traceId: createTraceId(),
      },
    });
    return ok(user);
  }

  @RequirePermissions('system:user:update')
  @Patch(':id/roles')
  async assignRoles(@CurrentUser() currentUser: RequestUser, @Param('id') id: string, @Body() body: unknown) {
    const input = AssignUserRolesSchema.parse(body);
    const user = await this.prisma.user.findFirstOrThrow({
      where: { id, tenantId: currentUser.tenantId, deletedAt: null },
      select: { id: true },
    });
    const roles = await this.prisma.role.findMany({
      where: { tenantId: currentUser.tenantId, id: { in: input.roleIds }, deletedAt: null },
      select: { id: true },
    });
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: user.id } }),
      this.prisma.userRole.createMany({
        data: roles.map((role) => ({ userId: user.id, roleId: role.id })),
        skipDuplicates: true,
      }),
    ]);
    return ok({ id: user.id, roleCount: roles.length });
  }
}
