import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { getEntryLocale, localePath, sitePath } from '../i18n/ui';

export async function GET(context) {
	const posts = await getCollection('blog');
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: new URL(sitePath('/'), context.site),
		items: posts.map((post) => ({
			...post.data,
			link: localePath(`/blog/${post.data.translationKey}`, getEntryLocale(post)),
		})),
	});
}
