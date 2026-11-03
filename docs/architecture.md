# 项目结构与当前边界

```text
apps/
  web/       Astro 博客（保留本地 Markdown/MDX 内容源）
  admin/     React + Vite + Ant Design 管理界面
  api/       NestJS + Prisma + PostgreSQL
packages/
  contracts/ 共享 Zod 校验规则与 API 类型（不包含数据库密钥）
  tsconfig/  共享 TypeScript 配置
deploy/      Compose、Nginx 和 systemd 配置
scripts/     手动构建、发布脚本
```

当前完成管理员登录和数据库内容管理，但尚不是完整发布 CMS。
API 提供 `/api/health`、`/api/auth/{login,me,logout}`、`/api/posts` 与
`/api/moments`。后台文章与碎碎念支持 CRUD、分页、搜索、状态筛选；文章
支持多个语言版本。分类标签支持 CRUD、搜索、关联文章数量，并接入文章单分类、
多标签和列表筛选；删除分类标签只解除文章关联。素材已接入七牛云上传、分页、
搜索和说明管理；站点设置仍是占位功能，发布管理已实现快照构建与原子切换。
上传只写 ai-dramas 的 blog/ 前缀，凭据不
传入浏览器。详见 qiniu.md。

所有业务 API 默认要求会话，只有登录和健康检查标记为公开。随机会话令牌
仅存于 HttpOnly、SameSite=Strict cookie，数据库保存 SHA-256 摘要，7 天过期。
密码用带随机盐的 scrypt 哈希。写请求校验配置的 Origin、JSON 类型及 CSRF
令牌；登录按来源 IP 限流。没有公开注册接口，所有 User 都是通过本机初始化
命令创建的受信管理员。后续如开放注册或多角色必须增加显式角色/权限模型。

文章和碎碎念更新/删除必须提供 expectedUpdatedAt，过期版本返回 409，防止
多标签页或并行编辑静默覆盖。多语言修改使用数据库事务。

Prisma 初始模型：User、Post、PostTranslation、Moment、Category、Tag、Media、
Setting、PublishJob、Session。Post 的 translationKey 关联多语言版本，状态和发布时间
属于 Post；一个 Post 只能有一个对应语言的 PostTranslation。

后台发布从数据库生成公开内容快照，Astro 自定义 loader 安全渲染 Markdown，
然后构建并原子切换发布目录。本机/GitHub Pages 独立构建仍使用本地内容。
不要把用户输入的任意 MDX 当可信代码执行。流程和部署权限见 publishing.md。

上传文件和发布产物位于 `/www/blog-data/`，不进入 Git。数据库持久化使用
Docker named volume `blog_postgres_data`。
