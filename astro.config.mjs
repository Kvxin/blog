// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defaultLocale, locales } from './src/i18n/locales.ts';

// https://astro.build/config
export default defineConfig({
	site: 'https://example.com',
	i18n: {
		locales,
		defaultLocale,
		routing: {
			prefixDefaultLocale: false,
		},
	},
	integrations: [mdx(), sitemap(), react()],
	vite: { plugins: [tailwindcss()] },
	fonts: [
		{
			provider: fontProviders.local(),
			name: 'Atkinson',
			cssVariable: '--font-atkinson',
			fallbacks: ['sans-serif'],
			options: {
				variants: [
					{
						src: ['./src/assets/fonts/atkinson-regular.woff'],
						weight: 400,
						style: 'normal',
						display: 'swap',
					},
					{
						src: ['./src/assets/fonts/atkinson-bold.woff'],
						weight: 700,
						style: 'normal',
						display: 'swap',
					},
				],
			},
		},
	],
});

