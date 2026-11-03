import { TextDecoder } from 'node:util';

// Busboy's default multipart parameter charset is latin1. Browsers send UTF-8
// filename bytes. Decode only a lossless, valid UTF-8 byte sequence; keep actual
// Unicode strings and legacy latin1 names intact rather than inserting U+FFFD.
export function decodeMultipartFilename(name: string): string {
  if (![...name].every((character) => character.codePointAt(0)! <= 255)) return name;
  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(name, 'latin1'));
    return decoded;
  } catch { return name; }
}

export function safeFilename(name: string, extension: string): string {
  return (name.split(/[\\/]/).at(-1) ?? '').replace(/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g, '').normalize('NFC').slice(0, 255) || `image.${extension}`;
}
