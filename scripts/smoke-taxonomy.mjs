import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));
const base = process.env.SMOKE_API_URL ?? 'http://127.0.0.1:4321/api';
let cookie = '';
let csrf = '';
const created = [];
async function call(path, method = 'GET', body, extra = {}) {
  const response = await fetch(base + path, { method, signal: AbortSignal.timeout(15_000),
    headers: { Origin: process.env.ADMIN_ORIGIN, Cookie: cookie, 'X-CSRF-Token': csrf,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...extra },
    body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, data: await response.json(), headers: response.headers };
}
try {
  for (const path of ['/categories', '/tags']) assert.equal((await call(path)).status, 401);
  const login = await call('/auth/login', 'POST', { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
  assert.equal(login.status, 201);
  cookie = login.headers.get('set-cookie').split(';')[0]; csrf = login.data.csrfToken;
  const suffix = randomUUID();
  const input = { name: '测试分类', slug: `test-category-${suffix}` };
  assert.equal((await call('/categories', 'POST', input, { 'X-CSRF-Token': '' })).status, 403);
  assert.equal((await call('/tags', 'POST', input, { Origin: 'https://invalid.example' })).status, 403);
  assert.equal((await call('/categories', 'POST', { ...input, name: '  ' })).status, 400);
  assert.equal((await call('/tags', 'POST', { ...input, slug: '../bad' })).status, 400);
  const category = await call('/categories', 'POST', input);
  assert.equal(category.status, 201); created.push({ kind: 'categories', id: category.data.id });
  assert.equal((await call('/categories', 'POST', input)).status, 409);
  const tag = await call('/tags', 'POST', { name: '测试标签', slug: `test-tag-${suffix}` });
  assert.equal(tag.status, 201); created.push({ kind: 'tags', id: tag.data.id });
  const tag2 = await call('/tags', 'POST', { name: '保留标签', slug: `test-tag-two-${suffix}` });
  assert.equal(tag2.status, 201); created.push({ kind: 'tags', id: tag2.data.id });
  assert.ok((await call('/categories?search='+input.slug)).data.items.some((item) => item.id === category.data.id));
  assert.equal((await call('/tags?pageSize=101')).status, 400);
  const postInput = { translationKey: `taxonomy-post-${suffix}`, status: 'DRAFT', publishedAt: null,
    categoryId: category.data.id, tagIds: [tag.data.id, tag2.data.id],
    translations: [{ locale: 'zh-cn', title: '分类标签集成测试', description: '', content: '临时测试内容', coverUrl: null }] };
  assert.equal((await call('/posts', 'POST', { ...postInput, categoryId: 'missing' })).status, 400);
  assert.equal((await call('/posts', 'POST', { ...postInput, tagIds: ['missing'] })).status, 400);
  assert.equal((await call('/posts', 'POST', { ...postInput, tagIds: [tag.data.id, tag.data.id] })).status, 400);
  let post = await call('/posts', 'POST', postInput);
  assert.equal(post.status, 201); created.push({ kind: 'posts', id: post.data.id });
  assert.equal(post.data.category.name, input.name); assert.equal(post.data.tags.length, 2);
  const counts = await call('/categories?search='+input.slug);
  assert.equal(counts.data.items.find((item) => item.id === category.data.id)._count.posts, 1);
  assert.equal((await call(`/posts?categoryId=${category.data.id}&tagId=${tag.data.id}`)).data.total, 1);
  const older = post.data.updatedAt;
  const renamed = await call(`/categories/${category.data.id}`, 'PUT', { name: '改名分类', slug: input.slug, expectedUpdatedAt: category.data.updatedAt });
  assert.equal(renamed.status, 200);
  assert.equal((await call(`/categories/${category.data.id}`, 'PUT', { ...input, expectedUpdatedAt: category.data.updatedAt })).status, 409);
  assert.equal((await call(`/posts/${post.data.id}`, 'PUT', { ...postInput, expectedUpdatedAt: older })).status, 409);
  assert.equal((await call(`/categories/${category.data.id}`, 'DELETE', { expectedUpdatedAt: category.data.updatedAt })).status, 409);
  assert.equal((await call(`/categories/${category.data.id}`, 'DELETE', { expectedUpdatedAt: renamed.data.updatedAt })).status, 200);
  assert.equal((await call(`/tags/${tag.data.id}`, 'DELETE', { expectedUpdatedAt: tag.data.updatedAt })).status, 200);
  post = await call(`/posts/${post.data.id}`);
  assert.equal(post.status, 200); assert.equal(post.data.categoryId, null); assert.equal(post.data.tags.length, 1);
  assert.equal(post.data.tags[0].id, tag2.data.id);
  // Older clients omitting taxonomy must preserve remaining relations.
  const { categoryId, tagIds, ...legacy } = postInput;
  const legacyUpdate = await call(`/posts/${post.data.id}`, 'PUT', { ...legacy, expectedUpdatedAt: post.data.updatedAt });
  assert.equal(legacyUpdate.status, 200); assert.deepEqual(legacyUpdate.data.tagIds, [tag2.data.id]);
  const cleared = await call(`/posts/${post.data.id}`, 'PUT', { ...legacy, categoryId: null, tagIds: [], expectedUpdatedAt: legacyUpdate.data.updatedAt });
  assert.equal(cleared.status, 200); assert.equal(cleared.data.tags.length, 0);
  console.log('PASS: taxonomy CRUD/search/counts, authorization/CSRF, validation, duplicate slugs, post associations/filters, edit conflicts, safe unlink and legacy clients.');
} finally {
  if (cookie) {
    // Delete only IDs created by this test; posts first, then taxonomy.
    for (const item of [...created].reverse()) {
      if (item.kind === 'posts') {
        const current = await call(`/posts/${item.id}`);
        if (current.status === 200) assert.equal((await call(`/posts/${item.id}`, 'DELETE', { expectedUpdatedAt: current.data.updatedAt })).status, 200);
      } else {
        const records = await call(`/${item.kind}?pageSize=100&search=test-`);
        const current = records.data.items.find((record) => record.id === item.id);
        if (current) assert.equal((await call(`/${item.kind}/${item.id}`, 'DELETE', { expectedUpdatedAt: current.updatedAt })).status, 200);
      }
    }
    await call('/auth/logout', 'POST', {});
  }
  console.log('Temporary test records cleaned up.');
}
