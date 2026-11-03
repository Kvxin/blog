import manifest from '../../../../docs/qiniu-images.json';

// This manifest contains public URLs only, never storage credentials.
export function projectImage(path: string, fallback: string): string {
  const url = (manifest as Record<string, string>)[path];
  return url?.startsWith('https://cdn.kvxin.top/blog/') ? url : fallback;
}
