import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contentStatusSchema, healthResponseSchema } from '../src';
import { postInputSchema, momentInputSchema, listQuerySchema } from '../src';
import { taxonomyInputSchema, taxonomyUpdateSchema } from '../src';
import { publishInputSchema } from '../src';

test('publication remarks are optional, trimmed, bounded and strictly validated', () => {
  assert.deepEqual(publishInputSchema.parse({}), { remark: '' });
  assert.deepEqual(publishInputSchema.parse({ remark: '  更新文章\n修复图片  ' }), { remark: '更新文章\n修复图片' });
  assert.equal(publishInputSchema.safeParse({ remark: 'a'.repeat(500) }).success, true);
  assert.equal(publishInputSchema.safeParse({ remark: 'a'.repeat(501) }).success, false);
  assert.equal(publishInputSchema.safeParse({ remark: 1 }).success, false);
  assert.equal(publishInputSchema.safeParse({ remark: null }).success, false);
  assert.equal(publishInputSchema.safeParse({ command: 'bad' }).success, false);
});

test('only supported content statuses are accepted', () => {
  assert.equal(contentStatusSchema.parse('DRAFT'), 'DRAFT');
  assert.equal(contentStatusSchema.safeParse('UNKNOWN').success, false);
});

const post = { translationKey: 'valid-post', status: 'DRAFT', publishedAt: null,
  translations: [{ locale: 'zh-cn', title: '标题', description: '', content: '# 正文', coverUrl: null }] };
test('taxonomy names, slugs, duplicate tags and conflict versions are validated', () => {
  assert.deepEqual(taxonomyInputSchema.parse({ name: ' 技术 ', slug: 'web-dev' }), { name: '技术', slug: 'web-dev' });
  for (const input of [{ name: ' ', slug: 'valid' }, { name: '名称', slug: '../bad' }, { name: '名称', slug: '中文' }]) {
    assert.equal(taxonomyInputSchema.safeParse(input).success, false);
  }
  assert.equal(taxonomyUpdateSchema.safeParse({ name: '名称', slug: 'valid' }).success, false);
  assert.equal(postInputSchema.safeParse({ ...post, tagIds: ['a', 'a'] }).success, false);
  assert.equal(postInputSchema.safeParse({ ...post, tagIds: Array.from({ length: 51 }, (_, i) => String(i)) }).success, false);
  assert.equal(postInputSchema.safeParse({ ...post, categoryId: null, tagIds: [] }).success, true);
});
test('post validates duplicate locales, slugs and safe image URLs', () => {
  assert.equal(postInputSchema.safeParse(post).success, true);
  assert.equal(postInputSchema.safeParse({ ...post, translationKey: '../escape' }).success, false);
  assert.equal(postInputSchema.safeParse({ ...post, translations: [...post.translations, ...post.translations] }).success, false);
  assert.equal(postInputSchema.safeParse({ ...post, translations: [{ ...post.translations[0], coverUrl: 'javascript:alert(1)' }] }).success, false);
  assert.equal(postInputSchema.safeParse({ ...post, status: 'PUBLISHED' }).success, false);
});
test('moments and pagination are bounded', () => {
  assert.equal(momentInputSchema.safeParse({ locale: 'en', content: 'hello', location: null, images: [], status: 'DRAFT', publishedAt: null }).success, true);
  assert.equal(listQuerySchema.safeParse({ pageSize: 101 }).success, false);
  assert.equal(listQuerySchema.safeParse({ page: -1 }).success, false);
  assert.equal(listQuerySchema.parse({}).pageSize, 10);
});

test('health response requires a connected database and an ISO timestamp', () => {
  assert.equal(healthResponseSchema.safeParse({
    status: 'ok', database: 'up', timestamp: new Date().toISOString(),
  }).success, true);
  assert.equal(healthResponseSchema.safeParse({
    status: 'ok', database: 'down', timestamp: 'invalid',
  }).success, false);
});
