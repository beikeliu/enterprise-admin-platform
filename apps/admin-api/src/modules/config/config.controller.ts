import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, RequestUser } from '../../common/current-user';
import { RequirePermissions } from '../../common/permissions.decorator';
import { PrismaService } from '../../common/prisma.service';
import { ok } from '../../common/response';

const CreateDictTypeSchema = z.object({
  name: z.string().min(2).max(128),
  code: z.string().min(2).max(64).regex(/^[a-z][a-z0-9_]*$/),
  description: z.string().max(500).optional(),
});

const CreateDictItemSchema = z.object({
  label: z.string().min(1).max(128),
  value: z.string().min(1).max(128),
  color: z.string().max(32).optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
});

const UpdateFeatureFlagSchema = z.object({
  enabled: z.boolean(),
  description: z.string().max(500).optional().nullable(),
});

@Controller()
export class ConfigController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @RequirePermissions('config:dict:view')
  @Get('config/dicts')
  async dicts(@CurrentUser() user: RequestUser) {
    const items = await this.prisma.dictType.findMany({
      where: { tenantId: user.tenantId, deletedAt: null },
      include: { items: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
    return ok({
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        code: item.code,
        description: item.description,
        status: item.status,
        updatedAt: item.updatedAt.toISOString(),
        items: item.items.map((dictItem) => ({
          id: dictItem.id,
          label: dictItem.label,
          value: dictItem.value,
          color: dictItem.color,
          sortOrder: dictItem.sortOrder,
          status: dictItem.status,
        })),
      })),
    });
  }

  @RequirePermissions('config:dict:create')
  @Post('config/dicts')
  async createDict(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    const input = CreateDictTypeSchema.parse(body);
    const dict = await this.prisma.dictType.create({
      data: { tenantId: user.tenantId, ...input },
    });
    return ok({ id: dict.id, name: dict.name, code: dict.code });
  }

  @RequirePermissions('config:dict:update')
  @Post('config/dicts/:id/items')
  async createDictItem(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: unknown) {
    const input = CreateDictItemSchema.parse(body);
    const dict = await this.prisma.dictType.findFirstOrThrow({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    const item = await this.prisma.dictItem.create({
      data: { typeId: dict.id, ...input },
    });
    return ok({ id: item.id, label: item.label, value: item.value });
  }

  @RequirePermissions('config:feature-flag:view')
  @Get('config/feature-flags')
  async featureFlags(@CurrentUser() user: RequestUser) {
    const items = await this.prisma.featureFlag.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { updatedAt: 'desc' },
    });
    return ok({
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        code: item.code,
        description: item.description,
        enabled: item.enabled,
        rules: item.rules,
        updatedAt: item.updatedAt.toISOString(),
      })),
    });
  }

  @RequirePermissions('config:feature-flag:update')
  @Patch('config/feature-flags/:id')
  async updateFeatureFlag(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: unknown) {
    const input = UpdateFeatureFlagSchema.parse(body);
    const flag = await this.prisma.featureFlag.findFirstOrThrow({
      where: { id, tenantId: user.tenantId },
    });
    const updated = await this.prisma.featureFlag.update({
      where: { id: flag.id },
      data: input,
    });
    return ok({ id: updated.id, enabled: updated.enabled });
  }
}
