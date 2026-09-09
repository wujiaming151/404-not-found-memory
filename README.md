# 404 NOT FOUND

基于 Next.js 的视觉与嗅觉记忆实验。参与者可绘画、观看像素粒子重构、生成香氛建议、修改作品并下载 PNG 报告。分析使用确定性规则，不调用 AI 服务，不连接气味硬件。

## 本地运行

需要 Node.js 22.13+（建议 24 LTS）和 pnpm。依赖版本记录在 `pnpm-lock.yaml`。

```powershell
pnpm install
pnpm dev
```

本机也可运行 `./start.ps1`，脚本自动查找 Node（含 Codex 内置运行时），首次启动生成研究密码。`./start.ps1 -Production` 会构建并启动生产服务。

- 体验入口：`http://localhost:3000`
- 示例绘画：`http://localhost:3000/draw?demo=1`
- 研究入口：`http://localhost:3000/research`
- 研究密码：本机 `.env.local` 的 `RESEARCH_PASSWORD`，请勿提交到版本控制。

## 结构

| 路径                     | 职责                                     |
| ------------------------ | ---------------------------------------- |
| `src/app`                | 页面与 API；研究区域单独验证登录         |
| `src/components`         | 绘画工具、粒子渲染、结果与图表           |
| `src/lib/analysis.ts`    | RGB/HSV、主色聚合、亮度、留白与边缘密度  |
| `src/lib/fragrance.ts`   | 香调权重、名称、前中尾调、解释与版本     |
| `src/lib/db.ts`          | SQLite schema、索引与查询                |
| `src/lib/draft.ts`       | IndexedDB 草稿与最近 25 个画布状态       |
| `src/lib/report.ts`      | 独立 Canvas PNG 长图排版                 |
| `src/lib/particles/`     | Three.js GPU 粒子、Shader 与有界参数映射 |
| `src/i18n/`、`messages/` | next-intl 与中、英、韩、日四语言         |
| `tests`                  | Playwright 浏览器验收                    |

## 视觉设计

根目录 `DESIGN.md` 保留用户提供的完整设计参考。当前界面采用黑色展览空间、紫色主按钮、琥珀色强调和宽松排版；绘画纸面保持白色。Inter Variable 随应用本地加载，并使用系统中日韩字体回退，不依赖远程字体服务。

样式集中在 `src/app/constellation.css`。首页的三角粒子图形由 `src/lib/constellation.ts` 自行生成；结果粒子仍采样用户原图。新增点击涟漪、连续模式过渡、流动强度调节和沉浸观看。沉浸模式支持 Escape 退出和键盘焦点循环，无需重新创建 GPU 场景。滚动显现尊重减少动态效果设置。

`tests/design.spec.ts` 验证参考文件完整性、四语言的桌面／平板／手机宽度、粒子场景连续性和沉浸交互。

## 数据与算法

绘画以 1920 × 1440 PNG 提交，草稿和待提交数据保存在 IndexedDB。粒子支持漂浮、波浪、旋涡和重聚；颜色来自原图，鼠标与触控可扰动，桌面拖动可轻微旋转。自动调整粒子数量和像素比，隐藏时暂停，WebGL 不可用时使用 Canvas2D。尊重减少动态效果的系统设置。

右上角语言菜单即时切换整站文字，不跳转页面或重置绘画及粒子状态；选择保存在 Cookie 与 localStorage。初次访问读取浏览器语言。香型、植物、香料与分析说明使用结构化 ID 和模板，旧记录在读取时兼容转换。PNG 报告按当前语言生成，用户自己填写的标题保持原样。

Particleify 未确认有公开可调用的 API 或 SDK；其 HTML 导出需要登录 Pro，导出源码再封装的授权范围未确认。本项目采用独立实现，未复制 Particleify 代码或接入其编辑器。实现细节与限制见 [升级说明](docs/particle-and-language-upgrade.md)。

提交时服务端解码 PNG，缩采样到 256 × 192 并重新计算指标。主色比例以非留白区域为分母；留白定义为透明或 RGB 三通道均大于 244 的像素，因此涂白也视作留白。亮度为加权 RGB 的感知亮度近似值，并非色度学测量。复杂度为阈值边缘密度的归一化近似值。

冷暖按色相分类，低饱和像素为中性。所有比例采用最大余数分配以保证总和为 100%。香氛变体有固定种子，权重扰动不超过 12%；规则版本随结果保存。香调比例描述艺术映射方向，不代表香料投料浓度。

SQLite 保存于 `data/memory.sqlite`，含 `experiences` 和 `variants` 两张表。原始 PNG 以 BLOB 原子保存，通过图片 API 读取；结构化分析与香氛存为 JSON。每次提交保留独立快照；同一提交 ID 重试不会重复插入；重新生成追加变体。示例默认不进入研究列表，CSV 包含所选作品的全部香氛版本。

备份时使用 SQLite 备份工具，或停止服务后完整复制 `data/`。当前为单机演示架构；多实例部署应迁移到 PostgreSQL 与对象存储。知道完整 UUID 结果链接的人可以查看作品，研究列表和批量导出需要密码。外网正式部署前应增加参与者访问控制、数据保留策略与持久化登录限流。

## 验证

```powershell
pnpm test
pnpm lint
pnpm build
pnpm test:e2e
```

浏览器测试需要先启动服务，默认使用 Windows Edge，可通过 `PLAYWRIGHT_BROWSER_PATH` 指定其他 Chromium。测试作品标记为示例。截图和下载位于忽略的 `test-results/`。

覆盖算法边界、绘画与撤销重做、刷新恢复、保存失败重试、结果版本、报告下载、研究认证与 CSV。iPad 使用触控模拟，不等同于真实 Safari / Apple Pencil 硬件测试。局域网 iPad 访问建议使用 HTTPS，以获得完整浏览器存储与安全上下文能力。
