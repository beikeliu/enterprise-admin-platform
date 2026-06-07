import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, RequestUser } from '../../common/current-user';
import { RequirePermissions } from '../../common/permissions.decorator';
import { PrismaService } from '../../common/prisma.service';
import { ok } from '../../common/response';

const CreateFileSchema = z.object({
  name: z.string().min(1).max(256),
  mimeType: z.string().min(1).max(128),
  size: z.number().int().min(0),
  url: z.string().url(),
  visibility: z.enum(['private', 'internal', 'public']).default('private'),
});

@Controller('files')
export class FilesController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @RequirePermissions('file:asset:view')
  @Get()
  async list(@CurrentUser() user: RequestUser) {
    const items = await this.prisma.fileAsset.findMany({
      where: { tenantId: user.tenantId },
      include: { uploader: { select: { displayName: true, username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return ok({
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        mimeType: item.mimeType,
        size: item.size,
        url: item.url,
        visibility: item.visibility,
        uploaderName: item.uploader?.displayName ?? item.uploader?.username ?? '-',
        createdAt: item.createdAt.toISOString(),
      })),
    });
  }

  @RequirePermissions('file:asset:create')
  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    const input = CreateFileSchema.parse(body);
    const file = await this.prisma.fileAsset.create({
      data: {
        tenantId: user.tenantId,
        uploaderId: user.id,
        ...input,
      },
    });
    return ok({ id: file.id, name: file.name });
  }
}
