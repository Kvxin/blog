import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	loader: glob({
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
			heroImage: z.optional(image()),
		}),
});


const moments = defineCollection({
	loader: glob({
		base: './src/content',
		pattern: '*/moments/**/*.{md,mdx}',
		generateId: ({ entry }) => entry.replace(/\\/g, '/').replace(/\.(md|mdx)$/, ''),
	}),
	schema: ({ image }) => z.object({
		date: z.coerce.date(),
		location: z.string().optional(),
		images: z.array(z.object({ src: image(), alt: z.string() })).max(9).optional(),
	}),
});
export const collections = { blog, moments };


