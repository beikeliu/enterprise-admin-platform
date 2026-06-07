import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { createTraceId } from '@enterprise/shared-utils';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(JwtService)
    private readonly jwt: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { username, deletedAt: null },
      include: {
        tenant: true,
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    if (!user || user.status !== 'active') throw new UnauthorizedException('Invalid credentials');
    const passwordMatched = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatched) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        actorId: user.id,
        action: 'auth.login',
        resource: 'user',
        resourceId: user.id,
        traceId: createTraceId(),
      },
    });

    const permissions = user.roles.flatMap((item) =>
      item.role.permissions.map((rolePermission) => rolePermission.permission.code),
    );
    const roles = user.roles.map((item) => item.role.code);
    const menus = await this.getMenus(user.tenantId, permissions);

    return {
      accessToken: await this.jwt.signAsync({ sub: user.id, tenantId: user.tenantId }),
      user: {
        id: user.id,
        tenantId: user.tenantId,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        phone: user.phone,
        status: user.status as 'active' | 'disabled',
        roles,
        permissions,
      },
      menus,
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });
    const permissions = user.roles.flatMap((item) =>
      item.role.permissions.map((rolePermission) => rolePermission.permission.code),
    );
    return {
      id: user.id,
      tenantId: user.tenantId,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      phone: user.phone,
      status: user.status as 'active' | 'disabled',
      roles: user.roles.map((item) => item.role.code),
      permissions,
    };
  }

  async getMenus(tenantId: string, permissions: string[]) {
    const menus = await this.prisma.menu.findMany({
      where: {
        tenantId,
        visible: true,
        status: 'active',
      },
      orderBy: { sortOrder: 'asc' },
    });
    return menus
      .filter((menu) => !menu.permissionCode || permissions.includes(menu.permissionCode))
      .map((menu) => ({
        id: menu.id,
        title: menu.name,
        path: menu.routePath ?? '/',
        icon: menu.icon ?? undefined,
        permission: menu.permissionCode ?? undefined,
      }));
  }
}
