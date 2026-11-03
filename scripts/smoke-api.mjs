import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));
const base = process.env.SMOKE_API_URL ?? 'http://127.0.0.1:3000/api';
const origin = process.env.ADMIN_ORIGIN;
let cookie = '';
let csrf = '';
const records = [];
async function call(path, method = 'GET', body, overrides = {}) {
  const response = await fetch(`${base}${path}`, {
    signal: AbortSignal.timeout(15_000),
    method, headers: { Origin: origin, Cookie: cookie, 'X-CSRF-Token': csrf,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...overrides },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { response, data: await response.json() };
}
try {
  assert.equal((await call('/posts')).response.status, 401);
  assert.equal((await call('/moments')).response.status, 401);
  assert.equal((await call('/media')).response.status, 401);
  assert.equal((await call('/media/config')).response.status, 401);
  assert.equal((await call('/auth/login', 'POST', { email: process.env.ADMIN_EMAIL, password: 'wrong-password' })).response.status, 401);
  const login = await call('/auth/login', 'POST', { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
  assert.equal(login.response.status, 201);
  const setCookie = login.response.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Strict/i);
  cookie = setCookie.split(';')[0];
  csrf = login.data.csrfToken;
  assert.equal((await call('/auth/me')).response.status, 200);
  assert.equal(login.data.user.passwordHash, undefined);
  const mediaConfig = await call('/media/config');
  assert.equal(mediaConfig.data.bucket, 'ai-dramas');
  assert.equal(mediaConfig.data.prefix, 'blog/');
  assert.equal(mediaConfig.data.domain, 'https://cdn.kvxin.top');
  assert.equal(mediaConfig.data.QI_NIU_AK, undefined);
  assert.equal(mediaConfig.data.QI_NIU_SK, undefined);
  async function invalidUpload(headers) {
    const form = new FormData();
    form.append('file', new Blob(['not an image'], { type: 'image/png' }), 'fake.png');
    return fetch(`${base}/media/upload`, { method: 'POST', body: form,
      signal: AbortSignal.timeout(15_000), headers: { Origin: origin, Cookie: cookie, 'X-CSRF-Token': csrf, ...headers } });
  }
  assert.equal((await invalidUpload({ Cookie: '' })).status, 401);
  assert.equal((await invalidUpload({ 'X-CSRF-Token': '' })).status, 403);
  assert.equal((await invalidUpload({ Origin: 'https://attacker.invalid' })).status, 403);
  assert.equal((await invalidUpload({})).status, 400);
  const mediaList = await call('/media');
  assert.equal(mediaList.response.status, 200);
  assert.ok(mediaList.data.items.every((item) => item.storageKey.startsWith('blog/') && item.url.startsWith('https://cdn.kvxin.top/blog/')));
  const post = { translationKey: `smoke-${randomUUID()}`, status: 'DRAFT', publishedAt: null,
    translations: [{ locale: 'zh-cn', title: '临时测试文章', description: '', content: '# 测试', coverUrl: null },
      { locale: 'en', title: 'Temporary test', description: '', content: '# Test', coverUrl: null }] };
  assert.equal((await call('/posts', 'POST', post, { 'X-CSRF-Token': '' })).response.status, 403);
  assert.equal((await call('/posts', 'POST', post, { 'X-CSRF-Token': 'é'.repeat(64) })).response.status, 403);
  assert.equal((await call('/posts', 'POST', post, { Origin: 'https://attacker.invalid' })).response.status, 403);
  assert.equal((await call('/posts', 'POST', post, { Origin: '' })).response.status, 403);
  assert.equal((await call('/posts', 'POST', { ...post, translations: [post.translations[0], post.translations[0]] })).response.status, 400);
  const created = await call('/posts', 'POST', post);
  assert.equal(created.response.status, 201);
  assert.equal(created.data.translations.length, 2);
  records.push(`/posts/${created.data.id}`);
  assert.equal((await call('/posts', 'POST', post)).response.status, 409);
  assert.equal((await call(`/posts?search=${post.translationKey}&pageSize=101`)).response.status, 400);
  assert.ok((await call('/posts?search=临时测试文章')).data.items.some((item) => item.id === created.data.id));
  const updated = await call(records[0], 'PUT', { ...post, translations: [{ ...post.translations[0], title: '更新后标题' }], expectedUpdatedAt: created.data.updatedAt });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.data.translations.length, 1);
  assert.equal((await call(records[0], 'PUT', { ...post, expectedUpdatedAt: created.data.updatedAt })).response.status, 409);
  assert.equal((await call(records[0], 'DELETE', { expectedUpdatedAt: created.data.updatedAt })).response.status, 409);
  const moment = { locale: 'zh-cn', content: '临时测试碎碎念', location: null, images: [], status: 'DRAFT', publishedAt: null };
  const madeMoment = await call('/moments', 'POST', moment);
  assert.equal(madeMoment.response.status, 201);
  records.push(`/moments/${madeMoment.data.id}`);
  const changedMoment = await call(records[1], 'PUT', { ...moment, content: '更新后的碎碎念', expectedUpdatedAt: madeMoment.data.updatedAt });
  assert.equal(changedMoment.response.status, 200);
  assert.equal((await call(records[1], 'PUT', { ...moment, expectedUpdatedAt: madeMoment.data.updatedAt })).response.status, 409);
  console.log('PASS: login, session, access control, origin/CSRF, validation, posts/translations CRUD, moments CRUD and edit conflicts.');
} finally {
  for (const path of records) {
    const current = await call(path);
    if (current.response.status === 200) {
      assert.equal((await call(path, 'DELETE', { expectedUpdatedAt: current.data.updatedAt })).response.status, 200);
      assert.equal((await call(path)).response.status, 404);
    }
  }
  if (cookie) {
    assert.equal((await call('/auth/logout', 'POST', {})).response.status, 201);
    assert.equal((await call('/auth/me')).response.status, 401);
  }
  console.log('Temporary records removed; session invalidated.');
}
