# 内容管理 API

所有路径带 `/api` 前缀。除登录与健康检查外都需要有效会话。
浏览器写请求需同源 JSON 和 `X-CSRF-Token`（登录响应或 `/auth/me` 返回），
服务端检查 Origin 必须等于 `.env` 的 ADMIN_ORIGIN。

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| GET | `/health` | 数据库健康检查，公开 |
| POST | `/auth/login` | `{email,password}` 登录，设置 HttpOnly cookie |
| GET | `/auth/me` | 当前用户（不含密码哈希）和 CSRF token |
| POST | `/auth/logout` | `{}` 注销并撤销服务端会话 |
| GET | `/posts` | 分页文章列表，含语言版本 |
| POST | `/posts` | 创建文章及语言版本 |
| GET | `/posts/:id` | 获取文章 |
| PUT | `/posts/:id` | 完整更新文章和语言版本 |
| DELETE | `/posts/:id` | 删除文章及所有语言版本 |
| GET | `/moments` | 分页碎碎念列表 |
| POST | `/moments` | 创建碎碎念 |
| GET | `/moments/:id` | 获取碎碎念 |
| PUT | `/moments/:id` | 完整更新碎碎念 |
| DELETE | `/moments/:id` | 删除碎碎念 |
| GET | `/media/config` | 只返回空间/地区/外链等非秘密配置和凭据是否已配置 |
| GET | `/media` | 分页素材列表（仅 blog/ 记录） |
| POST | `/media/upload` | 单文件 multipart/form-data，字段为 file，最大 10 MB |
| PATCH | `/media/:id` | JSON `{alt}` 更新图片说明 |
| GET | `/categories`、`/tags` | 分页、搜索分类或标签，含关联文章数量 |
| POST | `/categories`、`/tags` | JSON `{name,slug}` 新建分类或标签 |
| PUT | `/categories/:id`、`/tags/:id` | 更新 name/slug，需 expectedUpdatedAt |
| DELETE | `/categories/:id`、`/tags/:id` | 需 expectedUpdatedAt；只解除关联，保留文章 |
| GET | `/publishing/overview` | 可发布内容数量、运行任务和当前版本 |
| GET | `/publishing/jobs` | 分页发布记录（不返回完整日志） |
| GET | `/publishing/jobs/:id` | 任务状态和构建日志 |
| POST | `/publishing/jobs` | JSON `{remark?: string}` 触发快照构建发布，运行中返回 409 |
| GET / PUT | `/ai/config` | 获取脱敏配置 / 保存 OpenAI 格式配置 |
| POST | `/ai/models` | 使用已保存接口获取模型列表 |
| POST | `/ai/test` | 使用已保存模型发送简短连通性请求 |
| POST | `/ai/translate` | 翻译当前文章/碎碎念编辑内容，仅返回预览，不写入文章 |

列表查询参数：`page`（默认 1）、`pageSize`（默认 10，最大 100）、`search`、
`status`（DRAFT/PUBLISHED/ARCHIVED）、`locale`（例如 zh-cn）。
返回 `{items,total,page,pageSize}`。详情和输入类型见 packages/contracts/src。

文章支持 categoryId（单分类，可为 null）和 tagIds（最多 50 个，不重复）。
文章列表支持 categoryId/tagId 筛选，并返回 category、tags、tagIds。
文章更新省略关联字段时保留原关联；显式 categoryId:null 或 tagIds:[] 可清空。
分类/标签名称支持中文，slug 仅小写字母、数字、连字符，同类型内唯一。
更名或删除分类/标签会更新关联文章的 updatedAt，防止旧编辑器覆盖关联变化。
taxonomy 列表查询参数为 page、pageSize、search（匹配名称或 slug）。

PUT 必须附加 `expectedUpdatedAt`，DELETE JSON body 同样提供该字段。
它是最新详情/列表的 updatedAt 字符串；值不匹配返回 409，不自动覆盖或删除。

文章 POST/PUT body：

```json
{
  "translationKey": "my-first-post",
  "status": "DRAFT",
  "publishedAt": null,
  "translations": [{
    "locale": "zh-cn",
    "title": "第一篇文章",
    "description": "摘要",
    "content": "# 正文\n\nMarkdown 内容",
    "coverUrl": null
  }]
}
```

碎碎念 POST/PUT body：

```json
{
  "locale": "zh-cn",
  "content": "今天的记录",
  "location": null,
  "images": [],
  "status": "DRAFT",
  "publishedAt": null
}
```

PUBLISHED 必须有 ISO 时间戳 publishedAt；保存后通过发布管理构建上线。
发布时间在未来的内容不会包含在本次快照中，时间到了也需要重新点击发布。
图片字段仅接受 HTTP/HTTPS URL；文件上传使用独立 `/media/upload` 接口，
返回含 id、storageKey、url、mimeType、size、alt 的素材记录。上传接口同样要求
会话、Origin、X-CSRF-Token，但 Content-Type 是浏览器自动生成的 multipart，
不要手动写死 boundary。后端不主动抓取用户提供的远程图片 URL。

主要错误码：400 参数错误、401 未登录/过期、403 来源或 CSRF 错误、404 内容
不存在、409 标识重复/编辑冲突、429 登录过于频繁。登录错误不区分邮箱和密码，
不存在公开注册、默认密码或业务写入绕过接口。
