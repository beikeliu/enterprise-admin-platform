import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma.service';
import { RequestUser } from '../../common/current-user';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService)
    private readonly jwt: JwtService,
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(Reflector)
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>('public', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: RequestUser;
    }>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Missing access token');

    const payload = await this.jwt.verifyAsync<{ sub: string }>(token).catch(() => null);
    if (!payload) throw new UnauthorizedException('Invalid access token');

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
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

    if (!user || user.status !== 'active' || user.deletedAt) {
      throw new UnauthorizedException('User is not available');
    }

    request.user = {
      id: user.id,
      tenantId: user.tenantId,
      username: user.username,
      roles: user.roles.map((item) => item.role.code),
      permissions: user.roles.flatMap((item) =>
        item.role.permissions.map((rolePermission) => rolePermission.permission.code),
      ),
    };
    return true;
  }
}
