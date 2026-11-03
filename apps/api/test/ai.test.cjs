const assert = require('node:assert/strict');
const { test } = require('node:test');
const { AiService } = require('../dist/modules/ai/ai.service');
const { encryptKey, decryptKey } = require('../dist/modules/ai/ai.crypto');
const { protectMarkdown } = require('../dist/modules/ai/ai.format');
const { aiConfigInputSchema } = require('@blog/contracts');

test('AI configuration starts empty and secret is never returned', async () => {
  const key = 'a'.repeat(64);
  let row = null;
  const db = { setting: {
    findUnique: async () => row,
    create: async ({ data }) => { row = { ...data, updatedAt: new Date() }; return row; },
    updateMany: async ({ data }) => { row = { ...row, ...data }; return { count: 1 }; },
  } };
  const service = new AiService(db, { get: () => key });
  const config = await service.get();
  assert.equal(config.baseUrl, ''); assert.equal(config.model, ''); assert.equal(config.prompt, '');
  assert.equal(config.hasApiKey, false); assert.equal(config.temperature, null); assert.equal(config.maxTokens, null);
  const saved = await service.save({ name: '测试', baseUrl: 'https://example.com/v1', model: 'test-model', prompt: '用户自己的提示词', temperature: null, maxTokens: null, apiKey: 'test-private-key', expectedUpdatedAt: null });
  assert.equal(saved.hasApiKey, true);
  assert.ok(!JSON.stringify(saved).includes('test-private-key'));
  assert.ok(!JSON.stringify(row).includes('test-private-key'));
  assert.equal(decryptKey(row.value.encryptedKey, key), 'test-private-key');
});

test('keys are authenticated encrypted and cannot be decrypted by another key', () => {
  const encrypted = encryptKey('private', 'a'.repeat(64));
  assert.equal(decryptKey(encrypted, 'a'.repeat(64)), 'private');
  assert.throws(() => decryptKey(encrypted, 'b'.repeat(64)));
});

test('Markdown code and image/link targets survive and missing placeholders fail', () => {
  const source = '# 标题\n\n```javascript\nconsole.log("中文");\n```\n\n`const x = 1`\n\n![说明](https://cdn.kvxin.top/blog/test.png)\n[文档](https://example.com)';
  const { prepared, restore } = protectMarkdown({ content: source }, 'test');
  assert.ok(!prepared.content.includes('console.log'));
  assert.ok(!prepared.content.includes('https://cdn'));
  assert.equal(restore(prepared).content, source);
  assert.throws(() => restore({ content: 'no placeholders' }));
  assert.throws(() => restore({ content: prepared.content + prepared.content }));
});

test('translation validates returned JSON and preserves source fields using mock completion', async () => {
  const service = new AiService({ setting: { findUnique: async () => ({ value: { prompt: 'Translate', model: 'mock' }, updatedAt: new Date() }) } }, {});
  service.chat = async (messages) => {
    const fields = JSON.parse(messages[1].content);
    return JSON.stringify({ ...fields, title: 'Title', description: 'Description', content: fields.content.replace('正文', 'Body') });
  };
  const result = await service.translate({ kind: 'post', sourceLocale: 'zh-cn', title: '标题', description: '摘要', content: '正文\n\n```js\nconst a = 1;\n```' });
  assert.equal(result.title, 'Title'); assert.ok(result.content.includes('const a = 1;'));
  service.chat = async () => 'not JSON';
  await assert.rejects(service.translate({ kind: 'moment', sourceLocale: 'zh-cn', content: '正文' }), { status: 502 });
});

test('base URL cannot include credentials, queries, insecure protocol or unknown settings', () => {
  const input = { name: '', baseUrl: '', model: '', prompt: '', temperature: null, maxTokens: null, expectedUpdatedAt: null };
  assert.equal(aiConfigInputSchema.safeParse(input).success, true);
  for (const baseUrl of ['http://example.com/v1', 'https://user:secret@example.com', 'https://example.com?key=secret']) assert.equal(aiConfigInputSchema.safeParse({ ...input, baseUrl }).success, false);
  assert.equal(aiConfigInputSchema.safeParse({ ...input, command: 'bad' }).success, false);
});

test('model requests reject private/local network targets before sending secrets', async () => {
  const key = 'a'.repeat(64);
  for (const baseUrl of ['https://127.0.0.1/v1', 'https://10.0.0.1/v1', 'https://169.254.169.254/v1', 'https://[::1]/v1']) {
    const service = new AiService({ setting: { findUnique: async () => ({ value: { baseUrl, encryptedKey: encryptKey('private-key', key) }, updatedAt: new Date() }) } }, { get: () => key });
    await assert.rejects(service.models(), { status: 400 });
  }
});
