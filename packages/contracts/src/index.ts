import { z } from 'zod';

export const contentStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export type ContentStatus = z.infer<typeof contentStatusSchema>;

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  database: z.literal('up'),
  timestamp: z.iso.datetime(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

const localeSchema = z.string().regex(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/).max(35);
const safeImageUrl = z.string().max(2048).refine((value) => {
  if (!value) return true;
  try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
}, '图片地址必须为 HTTP 或 HTTPS URL');

export const loginSchema = z.object({
  email: z.email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(256),
});
export const adminUserSchema = z.object({ id: z.string(), email: z.email(), displayName: z.string() });
export const authResponseSchema = z.object({ user: adminUserSchema, csrfToken: z.string() });
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const postInputSchema = z.object({
  translationKey: z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, '使用小写字母、数字和连字符'),
  status: contentStatusSchema,
  publishedAt: z.iso.datetime().nullable(),
  categoryId: z.string().min(1).max(100).nullable().optional(),
  tagIds: z.array(z.string().min(1).max(100)).max(50).refine((ids) => new Set(ids).size === ids.length, '标签不能重复').optional(),
  translations: z.array(z.object({
    locale: localeSchema,
    title: z.string().trim().min(1).max(200),
    description: z.string().max(500),
    content: z.string().min(1).max(200_000),
    coverUrl: safeImageUrl.nullable(),
  })).min(1).max(20),
}).superRefine((value, ctx) => {
  if (new Set(value.translations.map((item) => item.locale)).size !== value.translations.length) {
    ctx.addIssue({ code: 'custom', path: ['translations'], message: '语言不能重复' });
  }
  if (value.status === 'PUBLISHED' && !value.publishedAt) {
    ctx.addIssue({ code: 'custom', path: ['publishedAt'], message: '已发布内容需要发布时间' });
  }
});
export type PostInput = z.infer<typeof postInputSchema>;
export const postUpdateSchema = postInputSchema.and(z.object({ expectedUpdatedAt: z.iso.datetime() }));

export const momentInputSchema = z.object({
  locale: localeSchema,
  content: z.string().trim().min(1).max(20_000),
  location: z.string().max(200).nullable(),
  images: z.array(z.object({ src: safeImageUrl.refine(Boolean, '请输入图片地址'), alt: z.string().max(300) })).max(20),
  status: contentStatusSchema,
  publishedAt: z.iso.datetime().nullable(),
}).superRefine((value, ctx) => {
  if (value.status === 'PUBLISHED' && !value.publishedAt) {
    ctx.addIssue({ code: 'custom', path: ['publishedAt'], message: '已发布内容需要发布时间' });
  }
});
export type MomentInput = z.infer<typeof momentInputSchema>;
export const momentUpdateSchema = momentInputSchema.and(z.object({ expectedUpdatedAt: z.iso.datetime() }));
export const deleteContentSchema = z.object({ expectedUpdatedAt: z.iso.datetime() });
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().max(200).default(''),
  status: contentStatusSchema.optional(),
  locale: localeSchema.optional(),
});

export const postListQuerySchema = listQuerySchema.extend({
  categoryId: z.string().min(1).max(100).optional(),
  tagId: z.string().min(1).max(100).optional(),
});
export const taxonomyInputSchema = z.object({
  name: z.string().trim().min(1, '请输入名称').max(80),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, '标识只允许小写字母、数字和连字符'),
});
export const taxonomyUpdateSchema = taxonomyInputSchema.extend({ expectedUpdatedAt: z.iso.datetime() });
export const taxonomyListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().max(200).default(''),
});
export type TaxonomyInput = z.infer<typeof taxonomyInputSchema>;
export type TaxonomyRecord = TaxonomyInput & { id: string; createdAt: string; updatedAt: string; _count: { posts: number } };

export type PostRecord = PostInput & {
  id: string; createdAt: string; updatedAt: string; categoryId: string | null; tagIds: string[];
  category: { id: string; name: string; slug: string } | null;
  tags: { id: string; name: string; slug: string }[];
};
export type MomentRecord = MomentInput & { id: string; createdAt: string; updatedAt: string };
export type PageResult<T> = { items: T[]; total: number; page: number; pageSize: number };

export const mediaListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
  search: z.string().max(200).default(''),
});
export const mediaAltSchema = z.object({ alt: z.string().max(300) });
export type MediaRecord = {
  id: string; storageKey: string; originalName: string; mimeType: string;
  size: number; alt: string; createdAt: string; url: string;
};
export type MediaConfig = {
  configured: boolean; bucket: string; region: string; domain: string;
  prefix: string; maxSize: number; allowedTypes: string[];
};

export const publishQuerySchema = taxonomyListQuerySchema;
export const publishInputSchema = z.object({
  remark: z.string().trim().max(500, '发布备注不能超过 500 字').default(''),
}).strict();
export type PublishJobRecord = {
  id: string; status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'; log: string; remark: string;
  startedAt: string | null; finishedAt: string | null; createdAt: string;
  releaseId: string | null; postCount: number; momentCount: number;
};
export type PublishingOverview = {
  activeJob: PublishJobRecord | null; currentRelease: string | null;
  posts: number; translations: number; moments: number; siteUrl: string;
};

export const aiConfigInputSchema = z.object({
  name: z.string().trim().max(80),
  baseUrl: z.string().trim().max(2048).refine((value) => {
    if (!value) return true;
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash; } catch { return false; }
  }, '接口地址必须为无账号、查询参数或片段的 HTTPS URL'),
  apiKey: z.string().trim().max(4096).optional(),
  clearApiKey: z.boolean().optional(),
  model: z.string().trim().max(200),
  prompt: z.string().trim().max(20_000),
  temperature: z.number().min(0).max(2).nullable(),
  maxTokens: z.number().int().min(1).max(32768).nullable(),
  expectedUpdatedAt: z.iso.datetime().nullable(),
}).strict();
export type AiConfigInput = z.infer<typeof aiConfigInputSchema>;
export type AiConfig = Omit<AiConfigInput, 'apiKey' | 'clearApiKey' | 'expectedUpdatedAt'> & { hasApiKey: boolean; updatedAt: string | null };
export const aiTranslateInputSchema = z.object({
  kind: z.enum(['post', 'moment']),
  sourceLocale: z.string().min(1).max(35),
  title: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  content: z.string().min(1).max(200_000),
  location: z.string().max(200).optional(),
  imageAlts: z.array(z.string().max(300)).max(20).optional(),
}).strict();
export type AiTranslateInput = z.infer<typeof aiTranslateInputSchema>;
export type AiTranslation = { title?: string; description?: string; content: string; location?: string; imageAlts?: string[] };
