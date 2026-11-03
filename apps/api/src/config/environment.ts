import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.url().refine((value) => value.startsWith('postgresql://') || value.startsWith('postgres://'), {
    message: 'DATABASE_URL must be a PostgreSQL connection URL',
  }),
  API_HOST: z.string().default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  UPLOAD_DIR: z.string().default('/www/blog-data/uploads'),
  ADMIN_ORIGIN: z.url(),
  SESSION_SECURE: z.enum(['true', 'false']).default('true').transform((value) => value === 'true'),
  QI_NIU_AK: z.string().min(1).optional(),
  QI_NIU_SK: z.string().min(1).optional(),
  QI_NIU_BUCKET: z.literal('ai-dramas').default('ai-dramas'),
  QI_NIU_REGION: z.literal('z2').default('z2'),
  QI_NIU_DOMAIN: z.literal('https://cdn.kvxin.top').default('https://cdn.kvxin.top'),
  QI_NIU_PREFIX: z.literal('blog/').default('blog/'),
  QI_NIU_PROXY: z.url().optional(),
  PUBLISH_ROOT: z.string().default('/www/blog-data'),
  BLOG_SITE_URL: z.url().default('http://1.117.61.219:4321'),
  BLOG_BASE_PATH: z.enum(['/', '/blog']).default('/blog'),
  AI_ENCRYPTION_KEY: z.string().regex(/^[a-f0-9]{64}$/).optional(),
});

export function validateEnvironment(config: Record<string, unknown>) {
  const result = schema.safeParse(config);
  if (!result.success) {
    // Do not include the original values: they may contain credentials.
    throw new Error(`Invalid environment: ${result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`);
  }
  return result.data;
}
