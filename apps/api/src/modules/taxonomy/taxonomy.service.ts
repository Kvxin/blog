import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { taxonomyInputSchema, taxonomyListQuerySchema, taxonomyUpdateSchema, deleteContentSchema } from '@blog/contracts';
import { PrismaService } from '../../database/prisma.service';
import { parse } from '../../common/validation';

export type TaxonomyKind = 'category' | 'tag';

@Injectable()
export class TaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  async list(kind: TaxonomyKind, query: unknown) {
    const { page, pageSize, search } = parse(taxonomyListQuerySchema, query);
    const where = search ? { OR: [
      { name: { contains: search, mode: 'insensitive' as const } },
      { slug: { contains: search, mode: 'insensitive' as const } },
    ] } : {};
    const args = { where, include: { _count: { select: { posts: true } } },
      skip: (page - 1) * pageSize, take: pageSize, orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }] };
    const [items, total] = kind === 'category'
      ? await this.prisma.$transaction([this.prisma.category.findMany(args), this.prisma.category.count({ where })])
      : await this.prisma.$transaction([this.prisma.tag.findMany(args), this.prisma.tag.count({ where })]);
    return { items, total, page, pageSize };
  }

  async create(kind: TaxonomyKind, body: unknown) {
    const data = parse(taxonomyInputSchema, body);
    const args = { data, include: { _count: { select: { posts: true } } } };
    return kind === 'category' ? this.prisma.category.create(args) : this.prisma.tag.create(args);
  }

  async update(kind: TaxonomyKind, id: string, body: unknown) {
    const { expectedUpdatedAt, ...data } = parse(taxonomyUpdateSchema, body);
    return this.prisma.$transaction(async (tx) => {
      const args = { where: { id, updatedAt: new Date(expectedUpdatedAt) }, data: { ...data, updatedAt: new Date() } };
      const result = kind === 'category' ? await tx.category.updateMany(args) : await tx.tag.updateMany(args);
      if (!result.count) {
        const existing = kind === 'category' ? await tx.category.findUnique({ where: { id } }) : await tx.tag.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('分类或标签不存在');
        throw new ConflictException('分类或标签已变更，请刷新后重试');
      }
      // Changing related taxonomy must invalidate any stale article editor too.
      await tx.post.updateMany({ where: kind === 'category' ? { categoryId: id } : { tags: { some: { id } } }, data: { updatedAt: new Date() } });
      const find = { where: { id }, include: { _count: { select: { posts: true } } } };
      return kind === 'category' ? tx.category.findUniqueOrThrow(find) : tx.tag.findUniqueOrThrow(find);
    });
  }

  async delete(kind: TaxonomyKind, id: string, body: unknown) {
    const { expectedUpdatedAt } = parse(deleteContentSchema, body);
    return this.prisma.$transaction(async (tx) => {
      // Claim the version before modifying related articles. Rollback if stale/missing.
      const args = { where: { id, updatedAt: new Date(expectedUpdatedAt) }, data: { updatedAt: new Date() } };
      const result = kind === 'category' ? await tx.category.updateMany(args) : await tx.tag.updateMany(args);
      if (!result.count) {
        const existing = kind === 'category' ? await tx.category.findUnique({ where: { id } }) : await tx.tag.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('分类或标签不存在');
        throw new ConflictException('分类或标签已变更，请刷新后重试');
      }
      const affected = await tx.post.updateMany({
        where: kind === 'category' ? { categoryId: id } : { tags: { some: { id } } },
        data: kind === 'category' ? { categoryId: null, updatedAt: new Date() } : { updatedAt: new Date() },
      });
      if (kind === 'category') await tx.category.delete({ where: { id } });
      else await tx.tag.delete({ where: { id } });
      return { ok: true, affectedPosts: affected.count };
    });
  }
}
