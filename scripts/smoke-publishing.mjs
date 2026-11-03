import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));
const base = 'http://127.0.0.1:4321/api';
const site = 'http://127.0.0.1:4321/blog';
let cookie = '', csrf = '';
const created = [];
async function call(path, method = 'GET', body, extra = {}) {
  const r = await fetch(base + path, { method, signal: AbortSignal.timeout(15_000), headers: {
    Origin: process.env.ADMIN_ORIGIN, Cookie: cookie, 'X-CSRF-Token': csrf,
    ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...extra,
  }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, data: await r.json(), headers: r.headers };
}
async function publish() {
  const result = await call('/publishing/jobs', 'POST', {});
  assert.equal(result.status, 201);
  const duplicate = await call('/publishing/jobs', 'POST', {});
  assert.equal(duplicate.status, 409);
  for (let i = 0; i < 90; i++) {
    const job = await call('/publishing/jobs/' + result.data.id);
    if (['SUCCEEDED', 'FAILED'].includes(job.data.status)) return job.data;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('Publish test timed out');
}
try {
  assert.equal((await call('/publishing/overview')).status, 401);
  const login = await call('/auth/login', 'POST', { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
  assert.equal(login.status, 201); cookie = login.headers.get('set-cookie').split(';')[0]; csrf = login.data.csrfToken;
  assert.equal((await call('/publishing/jobs', 'POST', {}, { 'X-CSRF-Token': '' })).status, 403);
  assert.equal((await call('/publishing/jobs', 'POST', { command: 'bad' })).status, 400);
  const suffix = randomUUID();
  const input = { translationKey: `publish-smoke-${suffix}`, status: 'PUBLISHED', publishedAt: new Date(Date.now() - 60_000).toISOString(),
    translations: [{ locale: 'zh-cn', title: '发布管理临时测试', description: '发布验证', content: '# 数据库正文\n\n<script>alert("XSS")</script>\n\n[危险链接](javascript:alert(1))\n\n安全正文', coverUrl: null },
      { locale: 'en', title: 'Publishing smoke test', description: '', content: 'English database content', coverUrl: null }] };
  const post = await call('/posts', 'POST', input); assert.equal(post.status, 201); created.push({ kind: 'posts', id: post.data.id });
  const draft = await call('/posts', 'POST', { ...input, translationKey: `draft-${suffix}`, status: 'DRAFT' }); assert.equal(draft.status, 201); created.push({ kind: 'posts', id: draft.data.id });
  const future = await call('/posts', 'POST', { ...input, translationKey: `future-${suffix}`, publishedAt: new Date(Date.now() + 86400_000).toISOString() }); assert.equal(future.status, 201); created.push({ kind: 'posts', id: future.data.id });
  const moment = await call('/moments', 'POST', { locale: 'zh-cn', content: `发布碎碎念测试-${suffix}`, location: '测试地点', images: [], status: 'PUBLISHED', publishedAt: input.publishedAt });
  assert.equal(moment.status, 201); created.push({ kind: 'moments', id: moment.data.id });
  const first = await publish();
  if (first.status !== 'SUCCEEDED') { console.log(first.log); throw new Error('Initial publish failed'); }
  const r = await fetch(`${site}/zh-cn/blog/${input.translationKey}/`); assert.equal(r.status, 200);
  const html = await r.text(); assert.ok(html.includes('数据库正文')); assert.ok(!html.includes('<script>alert')); assert.ok(!html.includes('href="javascript:'));
  assert.equal((await fetch(`${site}/blog/${input.translationKey}/`)).status, 200);
  assert.equal((await fetch(`${site}/zh-cn/blog/draft-${suffix}/`)).status, 404);
  assert.equal((await fetch(`${site}/zh-cn/blog/future-${suffix}/`)).status, 404);
  assert.ok((await (await fetch(site+'/zh-cn/moments/')).text()).includes(`发布碎碎念测试-${suffix}`));
  assert.ok((await (await fetch(site+'/rss.xml')).text()).includes(input.translationKey));
  assert.equal((await call('/publishing/overview')).data.currentRelease, first.id);
  console.log('PASS: actual database snapshot build, language routes, RSS, moments, draft/future exclusion, sanitization and concurrency control.');
  // Invalid Intl locale is allowed by the old content schema but causes build failure;
  // use a temporary record to prove an actual failure keeps the online version.
  const invalid = await call('/posts', 'POST', { ...input, translationKey: `bad-locale-${suffix}`, translations: [{ ...input.translations[0], locale: 'abc-12' }] });
  assert.equal(invalid.status, 201); created.push({ kind: 'posts', id: invalid.data.id });
  const failed = await publish();
  assert.equal(failed.status, 'FAILED');
  assert.equal((await call('/publishing/overview')).data.currentRelease, first.id);
  assert.equal((await fetch(`${site}/zh-cn/blog/${input.translationKey}/`)).status, 200);
  console.log('PASS: failed build preserves live release.');
} finally {
  for (const item of created.reverse()) {
    const current = await call(`/${item.kind}/${item.id}`);
    if (current.status === 200) assert.equal((await call(`/${item.kind}/${item.id}`, 'DELETE', { expectedUpdatedAt: current.data.updatedAt })).status, 200);
  }
  if (cookie && created.length) {
    const clean = await publish();
    if (clean.status !== 'SUCCEEDED') { console.log(clean.log); throw new Error('Cleanup publish failed'); }
    console.log('Test records removed, current database republished successfully.');
  }
  if (cookie) await call('/auth/logout', 'POST', {});
}
