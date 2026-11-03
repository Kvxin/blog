const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFile } = require('node:fs/promises');
const sharp = require('sharp');
const { inspectImage, MAX_IMAGE_SIZE } = require('../dist/modules/media/image');
const { decodeMultipartFilename, safeFilename } = require('../dist/modules/media/filename');

test('multipart UTF-8 filenames are restored without corrupting Unicode/latin1 names', () => {
  const name = '企业微信截图_20261014151444.png';
  assert.equal(decodeMultipartFilename(Buffer.from(name).toString('latin1')), name);
  assert.equal(decodeMultipartFilename(name), name);
  assert.equal(decodeMultipartFilename('photo.jpg'), 'photo.jpg');
  assert.equal(decodeMultipartFilename('café.png'), 'café.png');
  assert.equal(safeFilename('../目录/企业\u0000截图.png', 'png'), '企业截图.png');
});

test('real raster images are identified by content', async () => {
  for (const [format, mime, extension] of [['png', 'image/png', 'png'], ['jpeg', 'image/jpeg', 'jpg'], ['webp', 'image/webp', 'webp'], ['avif', 'image/avif', 'avif'], ['gif', 'image/gif', 'gif']]) {
    const data = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#cc8844' } }).toFormat(format).toBuffer();
    assert.deepEqual(await inspectImage(data), { mime, extension });
  }
});

test('renamed text, HTML, SVG, executable, ZIP, PDF and fake image headers are rejected', async () => {
  for (const data of [Buffer.from('hello.png'), Buffer.from('<html>evil</html>'), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>'), Buffer.from('MZ executable'), Buffer.from('PK\x03\x04 archive'), Buffer.from('%PDF-1.7'), Buffer.from('89504e470d0a1a0a00000000', 'hex'), Buffer.from('GIF89a garbage'), Buffer.from('RIFF0000WEBPgarbage')]) {
    await assert.rejects(inspectImage(data), { status: 400 });
  }
});

test('truncated images, empty files, oversized files and forged ICO payloads are rejected', async () => {
  const png = await sharp({ create: { width: 32, height: 32, channels: 3, background: 'red' } }).png().toBuffer();
  await assert.rejects(inspectImage(png.subarray(0, png.length - 20)), { status: 400 });
  await assert.rejects(inspectImage(Buffer.alloc(0)), { status: 400 });
  await assert.rejects(inspectImage(Buffer.alloc(MAX_IMAGE_SIZE + 1)), { status: 400 });
  const ico = Buffer.alloc(32);
  ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4);
  ico[6] = ico[7] = 1; ico.writeUInt32LE(10, 14); ico.writeUInt32LE(22, 18);
  ico.write('not image!', 22);
  await assert.rejects(inspectImage(ico), { status: 400 });
  assert.deepEqual(await inspectImage(await readFile('../web/public/favicon.ico')), { mime: 'image/x-icon', extension: 'ico' });
});
