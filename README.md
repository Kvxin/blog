# Astro Starter Kit: Blog

```sh
npm create astro@latest -- --template blog
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

Features:

- ✅ Minimal styling (make it your own!)
- ✅ 100/100 Lighthouse performance
- ✅ SEO-friendly with canonical URLs and Open Graph data
- ✅ Sitemap support
- ✅ RSS Feed support
- ✅ Markdown & MDX support

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── content/
│   ├── layouts/
│   └── pages/
├── astro.config.mjs
├── README.md
├── package.json
└── tsconfig.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

The `src/content/` directory contains language directories with `blog/` and `moments/` collections. Use `getCollection()` to retrieve Markdown and MDX entries, and type-check their frontmatter using a schema. See [Astro's Content Collections docs](https://docs.astro.build/en/guides/content-collections/) to learn more.

## Multilingual Content

```text
src/content/
├── en/
│   ├── blog/first-post.md
│   └── moments/first-note.md
└── zh-cn/
    ├── blog/first-post.md
    └── moments/first-note.md
```

- The top-level directory name determines the language; filenames no longer need language suffixes, and frontmatter does not need `language`.
- Keep the same `translationKey` in blog entries that are translations of each other. It also determines the article URL, independently of the filename.
- English is the default language and keeps unprefixed URLs, such as `/blog/first-post/`. Other languages use URLs such as `/zh-cn/blog/first-post/`.
- To add a language, create a directory named with its language code (for example, `src/content/ja/blog/`), add content, and restart the development server or rebuild. The Astro locale configuration, localized routes, and header language links are discovered automatically from these directories.
- Article pages show only languages with a matching `translationKey`, so switching languages does not lead to a missing translation.
- New languages use their native display name and fall back to English interface labels until translations are added in `src/i18n/ui.ts`.

Any static assets, like images, can be placed in the `public/` directory.

## Moments / 碎碎念

在 `src/content/zh-cn/moments/`（英文用 `src/content/en/moments/`）新建 Markdown 文件即可发布动态。不需要标题，正文可以是一句话、链接或 Markdown 图片。动态按日期从新到旧显示。

```markdown
---
date: '2026-10-05T18:30:00+08:00'
location: '下班路上' # 可选
images: # 可选，最多 9 张；路径相对于当前 Markdown 文件
  - src: './photos/sunset.jpg'
    alt: '傍晚天空的晚霞'
---

今天的晚霞好好看。
```

只有一张图时显示大图，多张图自动排列成三列，点击图片可以在新标签页查看。只发文字时，保留 `date` 和正文即可。发布仍通过内容文件和站点构建完成。

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## GitHub Pages 自动部署

站点地址：<https://kvxin.github.io/blog/>，中文页面：<https://kvxin.github.io/blog/zh-cn/>。

`.github/workflows/deploy.yml` 在推送到 `main` 时自动安装依赖、构建 Astro 并部署到 GitHub Pages，也可以在 GitHub Actions 页面手动运行。工作流使用 Node.js 24 和 `pnpm@11.25.0`，依赖由 `pnpm-lock.yaml` 锁定。

仓库 **Settings → Pages → Source** 使用 **GitHub Actions**。部署结果和网址可以在 **Actions → Deploy to GitHub Pages** 查看。

项目使用 `/blog` 作为站点前缀，本地开发访问 `http://localhost:4321/blog/`。内部链接使用 `localePath()`，公共资源使用 `sitePath()`；更换仓库名或绑定自定义域名时，请同步修改 `astro.config.mjs` 中的 `site` 和 `base`。

## 👀 Want to learn more?

Check out [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Credit

This theme is based off of the lovely [Bear Blog](https://github.com/HermanMartinus/bearblog/).
