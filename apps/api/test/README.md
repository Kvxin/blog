# Integration tests

运行中的 API 可通过根目录 `pnpm test:api` 执行集成冒烟测试，脚本位于
`scripts/smoke-api.mjs`。它读取根目录 .env 的初始化管理员凭据，检查登录、
会话、Origin/CSRF、参数校验、文章多语言 CRUD、碎碎念 CRUD、编辑冲突及退出。
测试临时创建内容，finally 中清理自行创建的记录；不删除已有内容。

单元校验位于 packages/contracts/test，使用 `pnpm test` 运行。
发布任务等后续模块应在此补充更多测试。
