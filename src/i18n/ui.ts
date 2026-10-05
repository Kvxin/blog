import { defaultLocale, locales, type Locale } from './locales';

export { defaultLocale, languages, locales, type Locale } from './locales';

const translations = {
	en: {
		home: 'Home', blog: 'Blog', about: 'About', language: 'Language',
		welcome: 'Welcome to my blog', intro: 'Notes on building, learning, and the web.',
		latestPosts: 'Latest posts', readMore: 'Read more', lastUpdated: 'Last updated on',
		aboutTitle: 'About Me', momentsTitle: 'Moments', momentsEyebrow: 'A little corner of everyday life', momentsDescription: 'Short notes, small observations, and things I want to remember.', footer: 'All rights reserved.',
	},
	'zh-cn': {
		home: '首页', blog: '博客', about: '关于', language: '语言',
		welcome: '欢迎来到我的博客', intro: '记录构建、学习与 Web 开发的点滴。',
		latestPosts: '最新文章', readMore: '阅读更多', lastUpdated: '最后更新于',
		aboutTitle: '关于我', momentsTitle: '碎碎念', momentsEyebrow: '日常记录', momentsDescription: '一些短句、小发现，以及想记录下来的生活片段。', footer: '版权所有。',
	},
} as const;

type UiTranslations = { [Key in keyof typeof translations.en]: string };

export const ui: Record<Locale, UiTranslations> = Object.fromEntries(
	locales.map((locale) => [
		locale,
		translations[locale as keyof typeof translations] ?? translations.en,
	]),
);

export function getLocale(pathname: string): Locale {
	const segment = pathname.split('/').filter(Boolean)[0];
	return locales.includes(segment) ? segment : defaultLocale;
}

export function getEntryLocale(entry: { id: string }): Locale {
	return entry.id.split('/')[0];
}

export function stripLocale(pathname: string) {
	const segment = pathname.split('/').filter(Boolean)[0];
	return locales.includes(segment) ? pathname.slice(segment.length + 1) || '/' : pathname;
}

export function getLocaleStaticPaths() {
	return locales.filter((locale) => locale !== defaultLocale).map((locale) => ({ params: { locale } }));
}

export function localePath(path: string, locale: Locale) {
	const clean = `/${path.replace(/^\/+|\/+$/g, '')}`;
	return locale === defaultLocale ? (clean === '/' ? '/' : `${clean}/`) : `/${locale}${clean === '/' ? '/' : `${clean}/`}`;
}

