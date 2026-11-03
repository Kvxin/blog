# AI 管理与英文翻译

后台 `/admin/ai` 仅支持 OpenAI 兼容的 Chat Completions 协议。
首次访问配置名称、Base URL、API Key、模型、系统提示词、Temperature、
输出 Token 上限全部为空；不预设供应商、模型、提示词或启用状态。

设计参考 [cc-switch](https://github.com/farion1231/cc-switch) 的以下组件：

- `src/components/providers/forms/shared/EndpointField.tsx`：独立接口地址字段
- `ApiKeySection.tsx`：独立密钥输入
- `ModelInputWithFetch.tsx`：手动填写模型，可获取模型列表
- `src/components/prompts/PromptFormPanel.tsx`：独立提示词编辑和保存

本项目使用 Ant Design 自行实现这些交互，只保留一个 OpenAI 格式配置。
没有多供应商列表、OAuth、预设模板或自动填充，也不复制其应用配置文件逻辑。

## 配置

填写完整 HTTPS API 前缀，例如服务商给出的以 `/v1` 结尾的地址。
后端追加 `/models` 获取模型列表、`/chat/completions` 测试和翻译。
只支持公网 HTTPS，不允许本机、私网、保留地址、URL 内凭据或重定向。
只支持非流式 Chat Completions，不支持 Responses/Anthropic/Gemini 格式。

先保存再测试。测试会发送简短请求，可能产生费用；模型列表不支持时可直接
手动填写模型 ID。Temperature/max_tokens 留空时不传，由接口使用自己的默认值。
用户必须填写翻译系统提示词，留空不能翻译。后端追加严格 JSON 输出和
代码/URL 占位符保护约束，不替用户填入风格提示词。

配置存在 Setting 的 `ai.openai`。Key 以 AES-256-GCM 加密，服务器加密密钥
为根目录 .env 的 AI_ENCRYPTION_KEY（不是 OpenAI 密钥）。此密钥已自动生成，
必须随数据库安全备份，丢失后需要重新输入 API Key。接口只返回 hasApiKey，
不会回传明文或密文；密钥输入留空保留旧值，也可明确清除或替换。
错误信息不暴露上游响应/headers/密钥；配置更新有版本冲突检测。

## 翻译

文章编辑器点击“AI 翻译为英文”，优先选择 zh-cn，否则选第一个非英文版本。
翻译标题、摘要和正文，保持 Markdown、代码和链接目标。先预览并允许编辑，
确认后填入同一篇文章的 en 版本，保留封面、分类标签和其他语言版本。
已有 en 会再次确认覆盖。随后需要手动保存和发布。

碎碎念翻译正文、地点和配图说明，图片 URL 不发送给模型改写。翻译已保存的
碎碎念时打开一个独立英文草稿，不修改原中文记录；新建未保存内容则在当前
表单中应用。英文草稿保存与发布仍由用户操作，不自动上线。

模型可能无法完全保持段落/Markdown 布局，预览是最终确认步骤；代码围栏、
行内代码和常见 Markdown 图片/链接目标有占位符保护，丢失/重复标记时拒绝
结果。输出不是有效 JSON、字段不完整、被截断或超时也拒绝应用。
内容会发给用户配置的服务，不会悄悄调用默认 AI。当前后台 HTTP 访问仍应
迁移到 HTTPS，避免用户输入密钥在浏览器到后台之间明文传输。

## 验证与限制

`pnpm --filter @blog/api test:ai`（先 build:api）检查空配置、加密、密钥脱敏、
Markdown 标记保护和模拟翻译结果。没有真实 AI 配置时不调用收费服务。
前端验收可用模拟响应，不会保存虚拟供应商或内容。翻译超时 120 秒，最多
一个并行翻译；未填写真实接口时不能验证真实服务的模型兼容性。
