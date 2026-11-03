import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { snapshotLoader } from './lib/snapshot-loader';

const blog = defineCollection({
	loader: process.env.BLOG_CONTENT_SNAPSHOT ? snapshotLoader('blog') : glob({
		base: './src/content',
		pattern: '*/blog/**/*.{md,mdx}',
		generateId: ({ entry }) => entry.replace(/\\/g, '/').replace(/\.(md|mdx)$/, ''),
	}),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			translationKey: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.union([image(), z.string().url()]).optional(),
			category: z.object({ name: z.string(), slug: z.string() }).nullable().optional(),
			tags: z.array(z.object({ name: z.string(), slug: z.string() })).optional(),
		}),
});


const moments = defineCollection({
	loader: process.env.BLOG_CONTENT_SNAPSHOT ? snapshotLoader('moments') : glob({
		base: './src/content',
		pattern: '*/moments/**/*.{md,mdx}',
		generateId: ({ entry }) => entry.replace(/\\/g, '/').replace(/\.(md|mdx)$/, ''),
	}),
	schema: ({ image }) => z.object({
		date: z.coerce.date(),
		location: z.string().optional(),
		images: z.array(z.object({ src: z.union([image(), z.string().url()]), alt: z.string() })).max(20).optional(),
	}),
});
export const collections = { blog, moments };

