import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type Locale = string;

export const defaultLocale: Locale = 'en';

const sourceLocales: string[] = process.env.BLOG_CONTENT_SNAPSHOT
  ? JSON.parse(readFileSync(process.env.BLOG_CONTENT_SNAPSHOT, 'utf8')).locales
  : readdirSync(resolve('src/content'), { withFileTypes: true })
	.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
	.map((entry) => entry.name);
export const locales = [...new Set(['en', 'zh-cn', ...sourceLocales])]
	.sort((left, right) => {
		if (left === defaultLocale) return -1;
		if (right === defaultLocale) return 1;
		return left.localeCompare(right);
	});

const languageNames: Record<Locale, string> = {
	en: 'English',
	'zh-cn': '简体中文',
};

export const languages = Object.fromEntries(
	locales.map((locale) => [
		locale,
		languageNames[locale] ?? new Intl.DisplayNames([locale], { type: 'language' }).of(locale) ?? locale,
	]),
);
