# Blog Workspace

个人博客及管理系统的 pnpm Monorepo。

| 应用 | 技术栈 | 当前状态 |
| --- | --- | --- |
| `apps/web` | Astro + React + Tailwind | 原博客已迁移，仍使用本地内容集合 |
| `apps/admin` | React + Vite + Ant Design | 登录、概览、文章多语言编辑、碎碎念管理 |
| `apps/api` | NestJS + Prisma | 会话鉴权、CSRF 防护、文章和碎碎念 CRUD |

`packages/contracts` 提供共享 API 类型与 Zod 规则，`packages/tsconfig` 提供
共享 TS 配置。已接入七牛云图片上传、分类标签和发布管理，站点设置尚未实现。
保存内容后到发布管理点击“构建并发布”，将已发布内容更新到公网静态博客。

## 开始使用

需要 Node.js >=22.13、pnpm 11.25.0、Docker Engine 和 Compose。

```bash
cp .env.example .env  # 已有 .env 不要覆盖；修改密码和 DATABASE_URL
chmod 600 .env
pnpm install --frozen-lockfile
pnpm db:up
pnpm db:generate
pnpm db:migrate
pnpm build
pnpm admin:init       # .env 中配置 ADMIN_EMAIL / ADMIN_PASSWORD 后创建管理员
```

所有命令从仓库根目录执行。

```bash
pnpm dev:api           # 127.0.0.1:3000/api/health
pnpm dev:admin         # 127.0.0.1:5174/admin/，代理 /api/
pnpm typecheck
pnpm test
pnpm test:api         # API 运行时执行集成冒烟测试，会创建并清理临时内容
pnpm db:status
pnpm db:psql
pnpm deploy:web        # 构建并原子切换静态博客版本
```

Astro 开发服务器依照 AGENTS.md 使用后台模式，并避开 Nginx 的 4321 端口：

```bash
pnpm --filter @blog/web exec astro dev --background --host 127.0.0.1 --port 4322
```

数据库默认仅绑定本机 5432，数据存放在 Docker 持久化卷中。
凭据仅放在未跟踪的 `.env`，不要提交到 Git。

## 文档

- [结构与实现边界](docs/architecture.md)
- [内容管理 API](docs/api.md)
- [七牛云图片上传与迁移](docs/qiniu.md)
- [发布管理](docs/publishing.md)
- [博客明暗主题](docs/theme.md)
- [AI 管理与英文翻译](docs/ai.md)
- [后台移动端适配](docs/admin-mobile.md)
- [正式域名部署](docs/domains.md)
- [部署、代理、备份和开发说明](docs/deployment.md)
- [Astro 博客内容与多语言说明](apps/web/README.md)

当前公网博客为 `https://kvxin.top/`（也支持 `https://www.kvxin.top/`），后台为 `https://kvxin.top/admin/`。
初始管理员账号和随机密码在根目录 `.env`，不公开显示或预填。
服务器已配置 HTTPS 和 Secure 会话 Cookie，旧 IP 地址自动跳转到正式域名。
