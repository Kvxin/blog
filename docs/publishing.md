# 发布管理

后台 `/admin/publishing` 显示可发布文章/语言版本/碎碎念数量、当前版本、
任务状态和日志。点击“构建并发布”确认后创建异步任务，页面轮询进度。
确认弹窗可填写发布备注（可选，最多 500 字，去除首尾空白），存入 PublishJob，
在发布记录和任务详情展示；旧记录的备注为空。备注不进入公开网站或构建命令。
请求只接受 `{remark?: string}`（兼容空 `{}`），不接受自定义命令、文件路径、
构建参数；所有接口都要求管理员会话。

发布流程：

1. 读取同一数据库事务快照中的 PUBLISHED 内容，且 publishedAt 不晚于快照时间。
2. 导出公开内容 JSON 到独立工作目录。不读取本地 Markdown 来合并 CMS 内容。
3. 复制受信 Astro 源码和依赖到工作目录，不改动 Git 项目或开发缓存。
4. 子进程执行固定 Astro 构建入口。环境只包含公开配置，不继承数据库密码、
   七牛 AK/SK、管理员密码、会话 token 等。
5. 新版本构建/首页验证通过，原子切换 `/www/blog-data/releases/current`。
   Nginx 使用该链接，无需重载；失败保留现有网站。
6. 发布记录保存结果、文章/碎碎念数量、时间和日志。重启后中断任务会标记失败；
   若链接已切换到任务版本，启动时核对并恢复成功状态。

数据库正文使用普通 Markdown 渲染并清理 HTML：不执行 MDX、JS imports、
script/事件属性或 javascript URL。七牛图片使用 HTTPS URL，不在构建时下载。
支持多语言路径、文章封面、碎碎念图片、分类标签展示和 RSS/sitemap。

保存内容不会立即改变线上站点。删除、归档、撤回为草稿后，重新发布才会从
线上移除。未来时间内容不会自动定时上线；时间到后手动发布。
数据库发布会完全取代线上内容源，原本地 Markdown 保留用于参考/开发，
不会与数据库混合发布。GitHub Pages 工作流仍构建本地内容，不连接数据库。

## 服务器配置

根目录 .env：

```text
PUBLISH_ROOT=/www/blog-data
BLOG_SITE_URL=http://1.117.61.219:4321
BLOG_BASE_PATH=/blog
```

BLOG_SITE_URL 为 origin，不包含 /blog；用于构建 canonical、RSS、sitemap。
正式域名服务器已改为 BLOG_SITE_URL=https://kvxin.top、BLOG_BASE_PATH=/，
后台发布到域名根路径；详情见 domains.md。
确定 HTTPS 域名后修改并重启 API。默认 GitHub Pages 构建仍用原 site 配置。

目录：

```text
/www/blog-data/
  builds/<任务ID>/        # 私有快照和构建工作目录（0700）
  releases/<任务ID>/      # 构建成功的静态输出（Nginx 可读）
  releases/current       # 当前线上版本链接
  publish.lock           # 与手动脚本共用的 flock 排他锁
```

API 用户 blog-api 仅获得 builds、releases 和 publish.lock 写权限；源代码与
依赖不授予写权限。systemd ProtectSystem/ProtectHome 保持启用。
服务按单实例运行；同一实例同一时间只有一个发布任务，flock 防止与手动
发布脚本同时切换。超时限制 5 分钟，服务停止会终止整个构建进程组。
任务完成后清理自己的构建工作目录，日志保存在数据库；旧发布版本保留，不自动删除。

`pnpm deploy:web` 仍是管理员手动发布本地文件的脚本，会使用同一发布锁；
CMS 站点日常更新使用后台发布管理，避免手动脚本将数据库内容覆盖为本地内容。

## 验证

`pnpm test:publishing` 是有副作用的集成验证，会创建临时数据库内容并实际
发布到当前博客，确认路由、RSS、草稿/未来内容过滤、清理与失败保留旧版。
测试结束删除自己的临时内容并重新发布当前数据库。仅在允许实际切换站点的
环境运行。API 必须已经启动。其他基础检查为 pnpm typecheck/test。
