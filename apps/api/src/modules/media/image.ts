import sharp from 'sharp';
import { BadRequestException } from '@nestjs/common';

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/x-icon'];

const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');
const isPng = (bytes: Buffer) => bytes.subarray(0, 8).equals(PNG_SIGNATURE);

function actualFormat(bytes: Buffer): string | undefined {
  if (isPng(bytes)) return 'png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString('ascii'))) return 'gif';
  if (bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  if (bytes.length >= 16 && bytes.subarray(4, 8).toString('ascii') === 'ftyp') {
    const size = bytes.readUInt32BE(0);
    if (size >= 16 && size <= bytes.length && size <= 4096) {
      const brands = [bytes.subarray(8, 12).toString('ascii')];
      for (let i = 16; i + 4 <= size; i += 4) brands.push(bytes.subarray(i, i + 4).toString('ascii'));
      if (brands.includes('avif') || brands.includes('avis')) return 'heif';
    }
  }
  return undefined;
}

async function decodeRaster(bytes: Buffer, expected: string) {
  const image = sharp(bytes, { limitInputPixels: 40_000_000, animated: true, failOn: 'warning' });
  const info = await image.metadata();
  if (info.format !== expected || expected === 'heif' && info.compression !== 'av1' ||
    !info.width || !info.height || info.width * info.height > 40_000_000 || (info.pages ?? 1) > 200) throw new Error('Invalid image');
  await image.stats(); // Force pixel decoding; a plausible header alone is insufficient.
  return info;
}

export async function inspectImage(bytes: Buffer): Promise<{ mime: string; extension: string }> {
  if (!bytes.length || bytes.length > MAX_IMAGE_SIZE) throw new BadRequestException('图片大小必须在 1 字节到 10 MB 之间');
  // ICO is a container: validate and decode EVERY embedded image, not just offsets.
  if (bytes.length >= 22 && bytes.readUInt32LE(0) === 0x00010000) {
    const count = bytes.readUInt16LE(4);
    if (!count || count > 32 || bytes.length < 6 + count * 16) throw new BadRequestException('ICO 格式无效');
    let end = 6 + count * 16;
    for (let i = 0; i < count; i++) {
      const start = 6 + i * 16;
      const length = bytes.readUInt32LE(start + 8);
      const offset = bytes.readUInt32LE(start + 12);
      if (!length || offset < end || offset + length > bytes.length) throw new BadRequestException('ICO 数据损坏');
      const frame = bytes.subarray(offset, offset + length);
      if (!isPng(frame)) throw new BadRequestException('仅支持内嵌 PNG 图像的 ICO，请将旧式 BMP 图标转为 PNG 后上传');
      try {
        const info = await decodeRaster(frame, 'png');
        if (info.width !== (bytes[start] || 256) || info.height !== (bytes[start + 1] || 256)) throw new Error('ICO dimensions mismatch');
      } catch { throw new BadRequestException('ICO 内嵌图片无法解码或尺寸不符'); }
      end = offset + length;
    }
    if (end !== bytes.length) throw new BadRequestException('ICO 含有异常尾部数据');
    return { mime: 'image/x-icon', extension: 'ico' };
  }
  try {
    const format = actualFormat(bytes);
    if (!format) throw new Error('Unsupported signature');
    const types: Record<string, { mime: string; extension: string }> = {
      jpeg: { mime: 'image/jpeg', extension: 'jpg' }, png: { mime: 'image/png', extension: 'png' },
      webp: { mime: 'image/webp', extension: 'webp' }, gif: { mime: 'image/gif', extension: 'gif' },
      heif: { mime: 'image/avif', extension: 'avif' }, avif: { mime: 'image/avif', extension: 'avif' },
    };
    const type = types[format];
    if (!type) throw new Error('Unsupported image');
    await decodeRaster(bytes, format);
    return type;
  } catch { throw new BadRequestException('图片无法解码或格式不支持，请使用 JPG、PNG、WebP、GIF、AVIF 或 ICO'); }
}
