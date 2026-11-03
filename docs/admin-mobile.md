# 后台移动端适配

后台以 768px 为桌面/手机布局分界，CSS 与 useMobile 共用这一断点。
不通过 User-Agent 判断手机，横竖屏或窗口大小变化时会更新布局。

- 手机使用顶部导航按钮 + 抽屉菜单，选择页面后关闭；账户操作放入菜单。
- 文章、碎碎念、分类标签和发布列表共用 ResponsiveTable：桌面表格、手机
  字段卡片，数据源、操作和分页回调不变。
- 表单工具栏、筛选和操作按钮可换行，输入字号至少 16px，避免部分 iOS
  浏览器聚焦小字号输入框时自动放大。没有禁止页面缩放。
- 登录/主布局使用 100% → 100svh → 100dvh 渐进增强，不使用 100vh。
  内容使用 min-height 和自然滚动，不把长表单锁在固定全屏高度内。
- viewport-fit=cover 与 safe-area-inset 留白适配刘海/圆角/底部手势区。
- 移动弹窗限制宽度和动态视口高度，内容内部滚动，页脚按钮保持可用。
  发布日志抽屉在手机占满宽度。
- interactive-widget=resizes-content 作为支持浏览器的键盘视口增强；不支持
  的浏览器继续自然滚动。dvh 本身不保证软键盘会缩小布局视口。

参考资料：

- [MDN CSS 长度与 svh/dvh](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/length#relative_length_units_based_on_viewport)
- [MDN env() 和安全区](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env)

浏览器模拟测试涵盖窄屏页面、抽屉导航、表单、素材选择弹窗、横屏和桌面。
模拟设备不能完整复现真实 iOS/Android 地址栏、软键盘和硬件安全区，发布后
仍应在真实手机上补充这些交互验证。
