import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { listQuerySchema, momentInputSchema, momentUpdateSchema, deleteContentSchema } from '@blog/contracts';
import { PrismaService } from '../../database/prisma.service';
import { parse } from '../../common/validation';
import type { Prisma } from '../../generated/prisma/client';

@Injectable()
export class MomentsService {
  constructor(private readonly prisma: PrismaService) {}
  async list(query: unknown) {
    const { page, pageSize, search, status, locale } = parse(listQuerySchema, query);
    const where: Prisma.MomentWhereInput = { status, locale, ...(search ? { content: { contains: search, mode: 'insensitive' } } : {}) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.moment.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }] }),
      this.prisma.moment.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }
  async get(id: string) {
    const moment = await this.prisma.moment.findUnique({ where: { id } });
    if (!moment) throw new NotFoundException('碎碎念不存在');
    return moment;
  }
  create(body: unknown) { return this.prisma.moment.create({ data: parse(momentInputSchema, body) }); }
  async update(id: string, body: unknown) {
    const { expectedUpdatedAt, ...input } = parse(momentUpdateSchema, body);
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.moment.updateMany({ where: { id, updatedAt: new Date(expectedUpdatedAt) }, data: { ...input, updatedAt: new Date() } });
      if (!result.count) {
        if (!await tx.moment.findUnique({ where: { id } })) throw new NotFoundException('碎碎念不存在');
        throw new ConflictException('内容已被其他操作修改，请重新加载后编辑');
      }
      return tx.moment.findUniqueOrThrow({ where: { id } });
    });
  }
  async delete(id: string, body: unknown) {
    const { expectedUpdatedAt } = parse(deleteContentSchema, body);
    const result = await this.prisma.moment.deleteMany({ where: { id, updatedAt: new Date(expectedUpdatedAt) } });
    if (!result.count) {
      if (!await this.prisma.moment.findUnique({ where: { id } })) throw new NotFoundException('碎碎念不存在');
      throw new ConflictException('内容已更新，请刷新列表再删除');
    }
    return { ok: true };
  }
}
