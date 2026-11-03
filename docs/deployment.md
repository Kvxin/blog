# 部署与日常操作

所有 pnpm 命令从仓库根目录执行。需要 Node.js >=22.13 与 pnpm 11.25.0。

## 首次启动

1. 复制 `.env.example` 为 `.env`，修改随机密码和对应 DATABASE_URL，执行
   `chmod 600 .env`。已有 `.env` 不要覆盖，尤其不要更换已有数据库卷的密码
   后误以为 POSTGRES_PASSWORD 会自动更新数据库用户。
2. `pnpm install --frozen-lockfile`
3. `pnpm db:up`
4. `pnpm db:generate && pnpm db:migrate`
5. `pnpm build`
6. 在 `.env` 配置 `ADMIN_EMAIL`、`ADMIN_PASSWORD`（至少 12 位）和 `ADMIN_NAME`，
   执行 `pnpm admin:init`。该命令仅创建新管理员，已有账号不会被覆盖或重置。

数据库只绑定 `127.0.0.1:5432`，API 默认绑定 `127.0.0.1:3000`。
不应通过宝塔放行这两个端口。

## 本机开发

先执行 `pnpm --filter @blog/contracts build`。

- API：`pnpm dev:api`
- 后台：`pnpm dev:admin`，访问 `http://127.0.0.1:5174/admin/`，
  Vite 会代理 `/api/` 到 3000。
- Astro：`pnpm --filter @blog/web exec astro dev --background --host 127.0.0.1 --port 4322`。
  公网 Nginx 已使用 4321，因此本机开发使用 4322。在 apps/web 下使用
  `astro dev status`、`astro dev logs` 和 `astro dev stop` 管理后台开发进程。

## 当前服务器

- 博客：`http://1.117.61.219:4321/blog/`
- 后台：`http://1.117.61.219:4321/admin/`，未登录会跳转 `/admin/login`。
- 健康检查：`http://1.117.61.219:4321/api/health`
- API 服务：`systemctl status blog-api`，日志：`journalctl -u blog-api -n 50`。
- 数据库：`pnpm db:status`；SQL 命令行：`pnpm db:psql`。

后端用专用 `blog-api` 系统用户运行。systemd 从根目录 `.env` 注入变量，
该文件不会公开或打包到前端。`/usr/local/bin/blog-node` 是部署时复制的
Node.js 运行文件，避免非 root 用户访问 `/root/.nvm`；更新 Node 后应同步更新。
`deploy/systemd/blog-api.service` 是当前机器的部署模板，路径需要按新机器调整。

更新博客：`pnpm deploy:web`。构建成功后复制到 releases 新版本，再原子更新
`/www/blog-data/releases/current` 软链接；失败不会覆盖已上线版本。
旧版本保留，不自动删除。后台更新：`pnpm build:admin`。后端更新：
`pnpm db:generate && pnpm build:api && pnpm db:migrate`，然后重启 blog-api。

后台已实现登录、数据库文章和碎碎念管理。登录账号与初始密码保存在 `.env`
的 `ADMIN_EMAIL` / `ADMIN_PASSWORD`。不提供注册接口。默认不在界面或日志
展示密码，初始化命令重复执行不更改已有账号。

当前配置 `ADMIN_ORIGIN=http://1.117.61.219:4321` 与 `SESSION_SECURE=false`
仅用于当前 HTTP 测试环境。HTTP 会暴露传输中的密码及会话，公网正式使用前
必须配置 HTTPS，随后将 ADMIN_ORIGIN 改为正式 HTTPS origin（不带路径），
SESSION_SECURE 改为 true 并重启 API。API 校验 Origin 必须与浏览器实际地址
完全一致，因此域名/端口变化后也要更新此配置。

可以通过 SSH 隧道避免经公网明文传输：
`ssh -L 14321:127.0.0.1:4321 用户@1.117.61.219`，然后在本机访问
`http://127.0.0.1:14321/admin/`。使用隧道期间将 ADMIN_ORIGIN 配为
`http://127.0.0.1:14321` 并重启 API（这也会限制原公网 origin 的写请求）。

API 只绑定 loopback，由 Nginx 转发 /api/。同源会话 cookie 和 CSRF 防护默认
保护所有业务接口。保存内容后通过后台发布管理构建上线，详见 publishing.md。

集成测试：启动 API 后运行 `pnpm test:api`。默认连接本机 3000，可通过
SMOKE_API_URL 改为 Nginx 地址。测试检查登录、权限、CSRF、参数校验、CRUD、
编辑冲突和退出；仅删除测试自行创建的记录。

## 网络代理

当前机器 mihomo HTTP 代理为 `http://127.0.0.1:7890`。安装依赖示例：

```bash
HTTPS_PROXY=http://127.0.0.1:7890 \
HTTP_PROXY=http://127.0.0.1:7890 \
npm_config_proxy=http://127.0.0.1:7890 \
npm_config_https_proxy=http://127.0.0.1:7890 \
pnpm install --frozen-lockfile --registry=https://registry.npmjs.org
```

Docker daemon 的代理配置在
`/etc/systemd/system/docker.service.d/mihomo-proxy.conf`。Docker 拉取镜像
使用该代理，本地 API/数据库不使用代理。Debian 的腾讯内网 apt 源直接连接，
Docker 官方 apt 源通过代理连接。不把这台机器的代理配置强制写入 pnpm
workspace，以免影响 CI 和其他开发者。

## 数据备份

```bash
docker compose --env-file .env -f deploy/docker-compose.yml exec -T postgres \
  pg_dump -U blog -d blog > blog-backup.sql
```

备份文件含业务数据，应存放在受保护的目录，不提交 Git。`docker compose down`
默认保留 named volume；不要使用 `down -v`，它会删除数据库数据。

## GitHub Pages

GitHub Pages 工作流构建 `apps/web`，仅发布静态博客；后台和 API 不会部署到
GitHub Pages。当前 Astro site 仍是 `https://kvxin.github.io`，因此 canonical、
RSS 和 sitemap 继续指向原 GitHub Pages 站点。确定正式域名后再调整 site。

原 npm lockfile 移至 `docs/legacy/package-lock.json` 仅供参考，不再用于安装。
历史已跟踪的 `.pnpm-store/v11/index.db` 保留，未删除；新的依赖缓存被忽略。
