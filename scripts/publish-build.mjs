import { spawn } from 'node:child_process';
import { cp, mkdir, chmod, readdir, readFile, writeFile, stat, symlink, rename } from 'node:fs/promises';
import { join, dirname } from 'node:path';
const [web, snapshot, release] = process.argv.slice(2);
if (!web || !snapshot || !release) throw new Error('Missing fixed worker paths');
const child = spawn(process.execPath, [join(web, 'node_modules/astro/bin/astro.mjs'), 'build'], {
  cwd: web, env: { ...process.env, BLOG_CONTENT_SNAPSHOT: snapshot }, stdio: 'inherit',
});
process.on('SIGTERM', () => child.kill('SIGTERM'));
const code = await new Promise((accept, reject) => { child.once('error', reject); child.once('close', accept); });
if (code !== 0) process.exit(1);
await mkdir(release, { recursive: true });
await cp(join(web, 'dist'), release, { recursive: true });
async function readable(path) {
  await chmod(path, 0o755);
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) await readable(child); else await chmod(child, 0o644);
  }
}
await readable(release);
if (!(await stat(join(release, 'index.html'))).size) throw new Error('Build missing index.html');
const data = JSON.parse(await readFile(snapshot, 'utf8'));
await writeFile(join(release, 'release.json'), JSON.stringify({ jobId: data.jobId, posts: data.postCount, moments: data.moments.length, snapshotAt: data.snapshotAt }), { mode: 0o644 });
const next = join(dirname(release), `.next-${data.jobId}`);
await symlink(release, next);
await rename(next, join(dirname(release), 'current'));
console.log('构建验证通过，已切换线上版本。');
