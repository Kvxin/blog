# 七牛云图片存储

## 当前配置

- 空间：`ai-dramas`
- 地区：华南-广东，Region ID `z2`
- 上传节点：`https://up-z2.qiniup.com`
- 图片外链：`https://cdn.kvxin.top`
- 对象键前缀固定为 `blog/`，前端不能指定对象键或空间。

七牛目录是对象键的前缀，不需要创建真实文件夹。上传到 `blog/project/...`
或 `blog/images/...` 后，控制台会显示 `blog` 目录。不会修改空间访问权限、
CORS、生命周期等配置，也不会操作已有的其他目录。

根目录 `.env` 配置 QI_NIU_AK / QI_NIU_SK。已有 AK/SK 保留不变，新增非秘密
配置 QI_NIU_BUCKET、QI_NIU_REGION、QI_NIU_DOMAIN、QI_NIU_PREFIX。
QI_NIU_PROXY 可选；当前机器使用 `http://127.0.0.1:7890`。
修改配置后 `systemctl restart blog-api`。AK/SK 只在后端签名，不提供获取上传
令牌的公开 API，不使用 VITE_/PUBLIC_ 环境变量。

## 后台操作

进入 `/admin/media`，上传图片、搜索素材、复制外链或编辑图片说明。
文章封面、碎碎念配图、Markdown 正文均可上传图片或从素材库选择。
正文选择图片后追加 `![说明](https://cdn.kvxin.top/blog/...)`，预览只自动加载
本项目 CDN 前缀的图片，不执行 SVG、HTML 或 MDX。

文件先经过本机 API 鉴权，再由后端上传七牛，因此浏览器不直传七牛，
无需为浏览器配置七牛 CORS。会话、Origin 和 CSRF 检查同样保护上传接口。
multipart/form-data 只在明确的上传接口允许，其他写接口继续要求 JSON。

支持 JPG、PNG、WebP、GIF、AVIF 和 ICO，单张最大 10 MB。
后端检查实际内容并解码，不信任扩展名或浏览器 MIME；SVG、HTML 和伪造图片
不允许。限制图片像素/帧数、同时云端上传数量及代理请求大小。
上传会先校验 JPG/PNG/WebP/GIF/AVIF 文件签名，再使用 Sharp 严格解码像素。
ICO 必须逐帧验证并解码内嵌 PNG；旧式 BMP ICO 不支持，可转为 PNG 上传。
中文 multipart 文件名按有效 UTF-8 解码后保存，避免 latin1 乱码。
`pnpm --filter @blog/api test:media` 执行内容校验与中文文件名单元测试（先构建 API）。
`pnpm --filter @blog/api media:repair-names` 修复可明确还原的历史中文乱码记录，
不改变七牛云对象和外链。
七牛上传策略限制到一个指定对象键，10 分钟有效，禁止覆盖已有对象。

## 现有图片迁移

`pnpm media:import` 扫描 apps/web 与 apps/admin 下 src/public 的源图片，排除
node_modules、构建产物和其他项目，上传到 `blog/project/` 并写入 Media 表。
按源路径和内容哈希生成稳定对象键，同一文件重复运行跳过已记录的对象。
`docs/qiniu-images.json` 记录源路径到公开 CDN URL 的映射，不含凭据。

目前 7 张源图片已迁移，含 favicon 和 6 张占位图片。本地原件不删除。
Astro 已通过公开映射使用七牛 favicon、默认分享图和关于页封面，无需在
GitHub Pages 构建时读取七牛凭据或连接数据库。其余占位图片暂未在页面使用，
但已可从素材库选择。未来新增的静态源图片上传后还需要在相应组件里引用 CDN
URL；不自动改写任意 Markdown 文件。

普通后台上传保存到 `blog/images/YYYY/MM/UUID.ext`，不覆盖旧图。
素材库只显示数据库中属于本项目 blog/ 的记录，不枚举空间全部内容。
本阶段不提供云端删除操作，避免删除正在引用的图片或影响同空间的其他应用。
如果云端成功但数据库写入失败，日志只记录非秘密对象键，提示管理员对账；
不会擅自删除对象。上传连接超时可在七牛控制台按 blog/ 前缀核对对象。

## 注意

CDN 域名必须能公开 HTTPS 访问这些对象。本次已验证迁移图片外链返回 200。
如将来开启私有空间或防盗链，应同步调整下载策略，不能直接假定公开 URL
永远可用。后台站点当前仍为 HTTP，图片 HTTPS 并不代表登录传输已加密。

图片上传即时生效；文章内容保存后通过发布管理构建上线，详见 publishing.md。
