import { readFileSync } from 'node:fs';
import type { Loader } from 'astro/loaders';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

export function snapshotLoader(collection: 'blog' | 'moments'): Loader {
  return {
    name: `database-snapshot-${collection}`,
    async load({ store, parseData }) {
      const snapshot = JSON.parse(readFileSync(process.env.BLOG_CONTENT_SNAPSHOT!, 'utf8'));
      store.clear();
      for (const entry of snapshot[collection]) {
        const data = await parseData({ id: entry.id, data: entry.data });
        // CMS content is Markdown data. Never execute MDX, imports or raw HTML.
        const html = sanitizeHtml(await marked.parse(entry.body, { async: true }), {
          allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img'],
          allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ['src', 'alt', 'title'], code: ['class'] },
          allowedSchemes: ['http', 'https', 'mailto'],
          allowedSchemesByTag: { img: ['http', 'https'] },
          allowProtocolRelative: false,
        });
        store.set({ id: entry.id, data, body: entry.body, rendered: { html, metadata: {} } });
      }
    },
  };
}
