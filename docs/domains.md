# 正式域名部署

- 博客：`https://kvxin.top/` 和 `https://www.kvxin.top/`
- 中文首页：`https://kvxin.top/zh-cn/`
- 后台：`https://kvxin.top/admin/`，www 后台自动跳转到主域名
- `test.kvxin.top` 保留原站点目录 `/www/wwwroot/kvxin`，不部署博客。

Nginx 使用 `/www/blog-data/releases/current` 的静态构建文件。后台发布成功后
切换该链接，两个博客域名同步更新，不需要复制到 wwwroot。

证书文件继续使用 certd 已配置的路径：

```text
/www/server/panel/vhost/cert/kvxin.top/full_chain.pem
/www/server/panel/vhost/cert/kvxin.top/cert.key
```

未修改 certd 自动续期配置，后置命令仍是 `nginx -t && nginx -s reload`。
两个博客域名的 HTTP 自动跳 HTTPS。博客 canonical/RSS/sitemap 使用主域名
kvxin.top，www 仍可访问。后台统一主域名，避免 Cookie 与 CSRF Origin 不一致。

服务器 .env 已配置 BLOG_SITE_URL=https://kvxin.top、BLOG_BASE_PATH=/、
ADMIN_ORIGIN=https://kvxin.top、SESSION_SECURE=true。密钥和账号未改。
旧 IP:4321 地址会重定向到主域名，旧 /blog/ 部署前缀在跳转时移除。
后台需要在 HTTPS 主域名重新登录。

Astro 默认仍保留 GitHub Pages 的 /blog 配置；服务器发布子进程通过环境变量
指定根路径。不要直接用默认本地 build 产物覆盖正式 CMS 站点。
正式发布使用后台发布管理，会保留数据库文章和碎碎念。

原 Nginx 配置备份位于 `/tmp/opencode/blog-domain-backup/`。域名部署配置的
仓库副本位于 deploy/nginx/kvxin.top.conf；宝塔当前生效文件位于
/www/server/panel/vhost/nginx/kvxin.top.conf。
