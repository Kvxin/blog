import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { postListQuerySchema, postInputSchema, postUpdateSchema, deleteContentSchema } from '@blog/contracts';
import { PrismaService } from '../../database/prisma.service';
import { parse } from '../../common/validation';
import type { Prisma } from '../../generated/prisma/client';

const include = { translations: true, category: true, tags: { orderBy: { name: 'asc' as const } } } as const;
function record<T extends { tags: { id: string }[] }>(post: T) { return { ...post, tagIds: post.tags.map((tag) => tag.id) }; }

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: unknown) {
    const { page, pageSize, search, status, locale, categoryId, tagId } = parse(postListQuerySchema, query);
    const where: Prisma.PostWhereInput = {
      status,
      categoryId,
      ...(tagId ? { tags: { some: { id: tagId } } } : {}),
      ...(search || locale ? { translations: { some: {
        locale, ...(search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { content: { contains: search, mode: 'insensitive' } }] } : {}),
      } } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({ where, include, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }] }),
      this.prisma.post.count({ where }),
    ]);
    return { items: items.map(record), total, page, pageSize };
  }

  async get(id: string) {
    const post = await this.prisma.post.findUnique({ where: { id }, include });
    if (!post) throw new NotFoundException('文章不存在');
    return record(post);
  }

  async create(body: unknown) {
    const { translations, categoryId, tagIds, ...input } = parse(postInputSchema, body);
    return this.prisma.$transaction(async (tx) => {
      await this.validateRelations(tx, categoryId, tagIds);
      return record(await tx.post.create({ data: { ...input, categoryId, tags: { connect: (tagIds ?? []).map((id) => ({ id })) },
        translations: { create: translations } }, include }));
    });
  }

  async update(id: string, body: unknown) {
    const { expectedUpdatedAt, translations, categoryId, tagIds, ...input } = parse(postUpdateSchema, body);
    return this.prisma.$transaction(async (tx) => {
      await this.validateRelations(tx, categoryId, tagIds);
      const result = await tx.post.updateMany({ where: { id, updatedAt: new Date(expectedUpdatedAt) }, data: { ...input, categoryId, updatedAt: new Date() } });
      if (!result.count) {
        if (!await tx.post.findUnique({ where: { id } })) throw new NotFoundException('文章不存在');
        throw new ConflictException('文章已被其他操作修改，请重新加载后编辑');
      }
      // Omitted association fields preserve existing data for older clients.
      if (tagIds !== undefined) await tx.post.update({ where: { id }, data: { tags: { set: tagIds.map((id) => ({ id })) } } });
      await tx.postTranslation.deleteMany({ where: { postId: id, locale: { notIn: translations.map((item) => item.locale) } } });
      for (const translation of translations) {
        await tx.postTranslation.upsert({ where: { postId_locale: { postId: id, locale: translation.locale } },
          update: translation, create: { ...translation, postId: id } });
      }
      return record(await tx.post.findUniqueOrThrow({ where: { id }, include }));
    });
  }

  private async validateRelations(tx: Prisma.TransactionClient, categoryId?: string | null, tagIds?: string[]) {
    if (categoryId && !await tx.category.findUnique({ where: { id: categoryId } })) throw new BadRequestException('所选分类不存在，请刷新后选择');
    if (tagIds?.length && await tx.tag.count({ where: { id: { in: tagIds } } }) !== tagIds.length) throw new BadRequestException('所选标签不存在，请刷新后选择');
  }

  async delete(id: string, body: unknown) {
    const { expectedUpdatedAt } = parse(deleteContentSchema, body);
    const result = await this.prisma.post.deleteMany({ where: { id, updatedAt: new Date(expectedUpdatedAt) } });
    if (!result.count) {
      if (!await this.prisma.post.findUnique({ where: { id } })) throw new NotFoundException('文章不存在');
      throw new ConflictException('文章已更新，请刷新列表再删除');
    }
    return { ok: true };
  }
}
