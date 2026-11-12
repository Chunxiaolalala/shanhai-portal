# 颜如玉 · 山海 OPC 主页

> 规格书唯一现行版本（云端）：https://www.workbuddy.cn/space/d/1BZLVhsK9lWE7khxIJ1GrI
> 本仓库只放**代码与工程资产**；规格书改动直接更新云端文档，本地 `颜如玉OPC主页_开发规格书_v2.md` 为归档。

## 当前状态：可运行原型 v0.5（竖屏 Touch 第一人称巡游上线）

三条路径都能完整走完内容：**桌面 3D 总览**、**桌面 2D 降级**、**手机竖屏巡游**，共用同一套卷轴内页与数据契约。
v0.3 接入 V05 小师妹 / V08 四兽；v0.4 把 V06 八帧御剑侠客切成循环动画光标；
v0.5 把 V12 竖版山海做成**手机首屏起始点小地图 → 跟着小师妹第一人称巡游 → 到站自动展卷 → 收卷继续下一境**的完整路径。
`npm run build` 通过（vue-tsc 严格检查 + Vite 生产构建，83 modules）。

> 竖屏实现对应云端规格书**第 14 章**（v2.2 增补）。M01–M08 尚未逐项拍板，代码按第 14 章的默认建议实现，
> 其中 **M02 明显留了开关**：手机默认跑 M0（V12 竖版 2.5D 第一人称），`?mode=m1` 才启用真 WebGL2 地面第一人称。
> 改 `tour.json → performance.m1Default` 即可翻面，不用动组件。

**已跑通**

| 层 | 内容 |
|---|---|
| 3D 主路径 | 程序化低多边形主峰（可 orbit 360°）、8 座程序化古风殿阁占位、射线 hover/点击、CatmullRom 镜头飞行、屏幕锚点投影、烛龙昼夜、pause/resume |
| 卷轴内页 | 古风卷轴展开、9 种配置化区块、朱砂「颜」印、收卷 / 回到来路 / 回到山门、ESC 逐层关闭、停留时长埋点 |
| 案例封装 | 留影石照壁（刻字大石 + HOVER 白雾 + 静态例图）、点击才入境、iframe 懒加载 / 关闭即销毁、主场景暂停、移动端封面 + 新标签兜底、三段式卡片 |
| 引导与氛围 | **水彩小师妹立绘**按 `order` 在殿阁间飞（96px + 月白柔光）、**毕方伴飞**、罗盘小地图（可点可 tab）、**四兽水彩图标**各司其职、**8 帧御剑侠客动画光标**（含淡金法术光带）、墨迹门框转场、跳过引导 |
| 2D 降级 | 无 WebGL / `?mode=static` 走完整 2D 山海热区，同一份内容契约、同一套卷轴 |
| **竖屏巡游** | **V12 竖版底图 + LQIP 秒出图**、**起始点小地图（8 落点 / 两步确认 / `?from=` 深链）**、**双层视差第一人称 + 小师妹带路**、Touch HUD（摇杆 / 安全区 / 44px 热区）、卷轴内页竖屏单栏、M1 真 3D 可选 + 连续低帧率自动降 M0 不丢进度 |
| 数据契约 | 全部殿阁 / 案例 / 工具 / 佐证 / 主张 / **巡游**走 JSON，加内容不动 3D 工程 |

**刻意没做（不是遗漏）**：WGSL 云雾 / 实例化流光 / GPU 视锥剔除（`RendererAdapter` 只探测 WebGPU，恒不启用）；**第一人称室内六自由度漫游仍排 v2**（第 14 章提前的只是地面巡游）；M1 真 3D 未设默认（程序化低多边形殿阁占位不够精致，等 V04 glb）；陀螺仪转头（iOS 权限弹窗，排 v1.1）；Lux3D glb 资产（等 V04 参考图）；真实案例例图与观星台截图（等 V11 / V14）；C10 真实邮箱（当前 `mailto:` 占位，CTA 自动显示「待配置」，不会产生坏链接）。

## 启动

```bash
npm install
npm run dev        # 本地开发 → http://127.0.0.1:5173/
npm run typecheck  # vue-tsc 严格检查
npm run build      # 类型检查 + 生产构建，产物 dist/
npm run preview    # 预览构建产物
```

URL 参数：

| 参数 | 作用 |
|---|---|
| `?mode=static` | 强制 2D 文字 / 山海降级路径 |
| `?mode=webgl2` | 强制 3D（跳过移动端降级判断） |
| `?p=yanan-ge` | 深链，桌面直接展开某座殿的卷轴；竖屏下当作起点的别名（从这一境起巡） |
| `?cursor=demo` | V06 光标自检：把御剑侠客停在舞台中央并亮起指尖柔光，免移动鼠标即可截图 / 目视验收 |
| `?mode=portrait` / `?mode=m0` | 强制走竖屏巡游（桌面浏览器会收成 390px 手机画幅便于走查） |
| `?mode=m1` | 强制真 WebGL2 地面第一人称；WebGL2 不达标会自动回落 M0 |
| `?mode=desktop` | 手机上也强制回桌面总览，便于对比两条路径 |
| `?from=yanan-ge` | 竖屏起点深链：小地图自动跳过，直接从这一境开始巡游，可分享 |
| `?tour=walk\|arrive\|scroll\|end` | 免交互验收：分别冻结在巡游 / 到站 / 卷轴 / 巡毕四个阶段 |

Windows PowerShell 若报「禁止运行脚本」，用 `npm.cmd run dev` 或执行一次
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`。

## 目录

```
src/
├── config/          全站内容 JSON（改数据不动 3D 工程）
│   ├── site.json        主张 / 姓名 / 邮箱占位
│   ├── scene.json       地形参数 / 相机锚点 / 镜头推导 / 性能预算
│   ├── pavilions.json   8 座殿阁 + 各自 sections（区块全配置化）
│   ├── cases.json       案例 + reserved 空卡槽
│   ├── tools.json       引客台三种 concept 工具
│   ├── evidenceSlots.json / assets.json
│   ├── cursor.json      V06 光标帧数 / 热点 / 节奏 / 缩放（几何字段由脚本生成）
│   └── tour.json        ★ 第 14 章：竖屏落点 / 节奏 / 镜头 / 视差 / HUD 文案 / 性能阈值
├── types/contract.ts    上面这些 JSON 的 TS 契约（含 CursorConfig / TourConfig）
├── core/
│   ├── config.ts        配置唯一读取入口（含 spawnPointFor 落点兜底）
│   ├── journey.ts       ★ 桌面导航状态源：镜头状态机 / 卷轴 / 引导 / 锚点 / 渲染控制
│   ├── tour.ts          ★ 竖屏巡游状态源：SELECT→GATE→WALK→ARRIVE→SCROLL→END
│   ├── device.ts        ★ 设备分流：桌面 / 竖屏 M0 / 竖屏 M1 + URL 强制
│   ├── cameraState.ts   六态状态机（BACK 回来路）
│   └── RendererAdapter.ts  WebGPU 探测 / WebGL2 兜底 / 静态降级
├── three/
│   ├── SceneRoot.ts     场景装配 + 射线 + 投影锚点 + 昼夜 + 渲染循环
│   ├── terrain/         mainPeak.ts 程序化主峰 / ridgeSpline.ts + waterSpline.ts 笔势
│   ├── camera/          openingShot.ts 开场机位 / flyTo.ts CatmullRom 飞行
│   ├── buildings/       pavilionMarker.ts 殿阁占位几何 / pavilionStyle.ts V04 兜底
│   ├── tour/            ★ TourSceneRoot.ts M1 贴地第一人称 / 低帧率自动降级
│   ├── materials/fog.ts / lighting/setup.ts   V01 母版取色 + 实测标定
├── ui/
│   ├── GateHero.vue          山门（可收起，避免挡住左侧殿阁）
│   ├── ScrollPanel.vue       古风卷轴容器
│   ├── ScrollSection.vue     9 种区块渲染器
│   ├── CaseStone.vue         留影石照壁 + 白雾
│   ├── CaseViewer.vue        iframe 懒加载 + 三段式
│   ├── CharacterImage.vue    ★ 角色资产统一入口（@error 回落内联 SVG）
│   ├── GuideShimei.vue       水彩小师妹 + 毕方伴飞 + 月白柔光
│   ├── CompassMap.vue        罗盘 + 鹿蜀守空卡槽（键盘可达）
│   ├── PavilionLabels.vue    HTML 殿阁标签（键盘可达主入口）
│   ├── BeastBar.vue          四兽职能控制条 / 引导开关 / 归位
│   ├── StaticFallback.vue    2D 山海降级 + 烛龙天际远景 + 热区 + 锚点
│   ├── SwordCursor.vue       ★ V06 八帧御剑动画光标（rAF 跟随 + 降级）
│   ├── TextIndex.vue         纯文字能力索引
│   ├── TransitionMask.vue    门框遮罩
│   ├── InkPlaceholder.vue    例图 / 佐证图占位线稿
│   └── portrait/        ★ 竖屏巡游：PortraitTour（编排）/ TourStartMap / PortraitBackdrop / TourHud
├── styles/              tokens / base / scroll / ornaments / cursor / portrait.css
├── assets/
│   ├── cursor/               swordsman-sheet.png（640×80 sprite）/ swordsman-static.png / 01..08 单帧
│   └── cursor-sword.svg      V06 之前的手写占位，已无引用，仅留档
└── telemetry.ts         殿阁点击 / 卷轴停留 / CTA / 案例打开 / 跳过引导 / 巡游起点·到站·退出
references/              参考图 + reference-mapping.json（MAPPING）
tools/lux3d/batch.json   Lux3D 图生 3D 输入清单
tools/images/prepare_characters.py   V05/V08 白底图 → 透明 WebP（离线工具）
tools/images/prepare_cursor.py       V06 八帧雪碧图 → 光标 sprite（离线工具）
tools/images/prepare_portrait.py     ★ V12 竖版 → 背景 / LQIP / 云海前景 / 落点标定图
public/
├── assets/characters/   5 张角色 WebP（约 180 KB，共）
├── assets/portrait/     ★ 竖版 WebP 115 KB + LQIP 0.4 KB + 云海前景 29.5 KB
├── favicon.svg / og-image.png（程序化占位）
```

## 加内容不改代码

- 加一座殿：`src/config/pavilions.json` 增一条，填 `order` 与 `position` → 3D 殿阁、导航、罗盘、小师妹顺序、文字索引自动同步。机位由 `scene.json → cameraApproach` 推导，不用补锚点。
- 加一个企业级案例：`src/config/cases.json` 增一条；`status: reserved` 会渲染成「未启之境」空石壁，`published` 会出刻字石壁 + 白雾 + 入境按钮。
- 换主张 / 邮箱：改 `src/config/site.json`。邮箱含 `MAIL_TO_BE_FILLED` 时 CTA 自动变成「待配置」提示。
- 换区块类型：见 `src/types/contract.ts` 的 `SectionType` + `src/ui/ScrollSection.vue`。

## 参考图状态

| 编号 | 文件 | 状态 | 消费位置 |
|---|---|---|---|
| V01 | `references/V01_moodboard/mood-master.png` | ready | tokens.css / fog.ts / lighting/setup.ts / mainPeak.ts 色阶 |
| V02 | `references/V02_yan_glyph/yan-reference.jpg` | ready | ridgeSpline.ts / waterSpline.ts（**只取笔意，不做字形**） |
| V03 | `references/V03_kunlun_peak/kunlun-01.jpg` | ready | mainPeak.ts / openingShot.ts（氛围参考，不反推几何） |
| V05 | `V05_shimei_character/shimei-front.source.jpg` | ready | 去底后 → `public/assets/characters/shimei.webp` → GuideShimei.vue |
| V06 | `V06_cursor_swordsman/ancient_swordsman_flight_sheet_transparent.png` | ready | 切帧后 → `src/assets/cursor/swordsman-sheet.png` → SwordCursor.vue / cursor.css |
| V08 | `V08_beasts_2d/*.source.jpg`（4 张） | ready | 去底后 → 同名 `.webp` → BeastBar / GuideShimei / CompassMap / StaticFallback |
| **V12** | **`V12_mobile_fallback/shanhai-mood-master.source.jpg`** | **ready** | 压缩 / 分层后 → `public/assets/portrait/*.webp` → TourStartMap / PortraitBackdrop / portrait.css |
| V04 / V07 / V09–V11 / V14 | 目录已建 | pending | 见 `references/reference-mapping.json` 的 `consumedBy[]` |

V05 / V08 的原图是白底 JPEG（另存时混进了浅灰棋盘格），走 `tools/images/prepare_characters.py` 统一去底、去水印、输出透明 WebP。处理链路、四兽命名依据与已知限制见 `references/README.md`「角色资产处理链路」一节；换形象只需替换 source 图并重跑脚本，组件不动。

代码里所有参考图消费点都留了 `[REF Vxx]` 注释；图缺失时组件走兜底默认值、构建不报错。
放完图只需把 MAPPING 的 `status` 改 `ready`，**不改组件代码**。
`references/_inspiration/` 是外部灵感图隔离区，不进 MAPPING、不打包上线。

### V06 光标处理链路（v0.4）

源图是一张 5472×3072 的 RGBA 雪碧图，8 帧**不是等宽网格硬排**：人物沿 x 近似等距、沿 y 做「起 → 抬 → 最高 → 落 → 沉 → 最低 → 再起 → 回位」的飞行起伏，淡金法术光带随帧长短呼吸。所以 `prepare_cursor.py` 用 `alpha>60` 连通域恰好检出 8 个人物主体块，按 x 中心排序即帧 1..8，再做三件事：

| 处理 | 原因 |
|---|---|
| 统一缩放（取 8 帧最大 bbox） | 人物大小严格一致，播放时不会忽大忽小 |
| 右边缘（剑尖）对齐 | 光带长短变化只影响左侧，人物不会左右抖 |
| 原始 `cy` 压缩成 `dy` 烘焙进格子 | 保留飞行起伏，又不撑破 80×80 |

产物：`swordsman-01..08.png`（80×80 单帧，人工验收用）、`swordsman-sheet.png`（640×80 横排，CSS `steps(8)` 消费）、`swordsman-static.png`（第 1 帧，原生 cursor 兜底）。另出一张 `references/V06_cursor_swordsman/cursor-preview.png` 浅米底拼图，换形象后先看它再上线。参数唯一来源是 `src/config/cursor.json`，几何字段由脚本写、交互字段（`durationMs / scale / hoverScale / trail`）可手调。

**双层光标**：CSS `cursor` 用不了可靠的动画图（Chrome 对 APNG 光标只显示首帧），所以精细指针设备上由 `SwordCursor.vue` 的 DOM sprite 播 8 帧（`steps(8)`，1.2s 一轮），`body.has-sword-cursor` 隐藏系统光标；无 JS、粗指针/触屏、`prefers-reduced-motion`、失焦、指针进入案例 iframe 时都回落到原生静态第 1 帧。位置更新走 rAF 直接写 `transform`，不触发 Vue 渲染。

已知边界：案例 iframe 是外链文档，内部光标由对方页面控制，DOM 层覆盖不到。

`image-request.json`、`swordsman-cursor-request.json`、`bg-remove-args.json` 是 MiniMax 生图 / 去背请求记录，**含临时签名的 OSS 链接，已在 .gitignore 排除**，不要提交、不要写进前端代码。工程根目录的原始图保留未动，已复制 / 移入 `references/` 对应目录。

## 竖屏巡游链路（v0.5 / 规格书第 14 章）

```
V12_mobile_fallback/shanhai-mood-master.source.jpg（1077×1920）
   │  tools/images/prepare_portrait.py
   │  · 全幅 WebP 115 KB / 36×64 LQIP 0.4 KB / 带 alpha 云海前景 29.5 KB
   │  · 朱红像素连通域实测 4 个亭子圆心 → 4 个落点直接套进原图光晕
   ▼
public/assets/portrait/*.webp
   │  tour.json（图片 / 8 落点 / 节奏 / 镜头 / 视差 / HUD 文案 / 性能阈值）
   │  device.ts（粗指针 + 窄屏 → 竖屏；WebGL2 达标且配置允许才 M1）
   ▼
SELECT 起始点小地图 → GATE 山门开场 → WALK 跟着小师妹走 → ARRIVE 殿前站定
   → SCROLL 卷轴内页 → 收卷自动续走下一境 → END 巡毕可重选起点
```

**双层背景不靠 JS 判 `load`**：LQIP 的 `<img>` 在下、高清 `<img>` 叠在上面；高清未解码时不绘制任何像素，解码完自然盖住。无头截图、弱网、缓存命中都不会卡在模糊底图上。

**M0 / M1 共源**：`tour.ts` 的 `tourWalk(0..1)` 同时驱动 M0 的背景推近与 M1 的贝塞尔相机插值。M1 连续 3s 低于 24fps 时只换渲染层，站点、进度、已看列表、`?from=` 全部保留；WebGL 初始化失败也走同一条降级。卷轴打开时暂停 3D 渲染，收卷恢复。

### M01–M08 当前实现取值（等你逐项拍板）

| 编号 | 规格书 14.9 的建议 | v0.5 实际 | 状态 |
|---|---|---|---|
| M01 | 自动跟随 + 摇杆接管 | 已按此；点地移动不做 | 按建议 |
| M02 | 中端以上跑 M1，低性能降 M0 | **手机默认 M0（竖版 2.5D）**；`?mode=m1` / `performance.m1Default` 才开 M1 | **待你拍板** |
| M03 | 山门 + 8 殿起点全开 | `pavilions.order` 生成 8 个落点全开，待启槽也进得去 | 按建议 |
| M04 | fov 72° / 眼高 1.6m | M1 按此；M0 用视差幅度 ±5.5% / ±3.2% 表达环顾 | 按建议 |
| M05 | 10s 无操作自动继续 | **到站 900ms 自动展卷、收卷自动续走**，不会卡住；未做「10s 自动收卷」（怕打断阅读） | **实现与规格书措辞不同，待确认** |
| M06 | 陀螺仪转头排 v1.1 | 未做 | 按建议 |
| M07 | 沿用现卷轴，竖屏单栏原生滚动 | 已做；桌面预览时 fixed 的卷轴 / 门框也收进 390px 手机框 | 按建议 |
| M08 | 另开 V15 给 HUD 参考，或沿用色板 | 沿用 V01 色板，未另开 V15 | 按建议 |

## 验证记录（2026-11-11）

- `npm run build`：vue-tsc 严格检查 + Vite 6.4.6，70 modules，约 2.43s，**通过**（v0.4）。
- 产物：主包 112.77 kB（gzip 44.54）、CSS 22.92 kB（gzip 5.78）、`SceneRoot` 懒加载 29.39 kB、`three` 独立 chunk 479.33 kB；V06 光标 sprite 43.11 kB + 静态帧 5.45 kB；角色 WebP 5 张共约 180 KB（静态资源，不进主包）→ 远低于 1.5 MB 预算。8 张单帧 PNG 只作验收产物，未被引用故不进 `dist/`。
- 无头浏览器实测：`?mode=static`、默认 3D（SwiftShader）、`?p=yanan-ge` 卷轴三条路径均正常渲染；据此标定了雾浓度、四盏灯强度、山体色阶与殿阁缩放。v0.3 追加核验：7 处 `data-character` 全部成功载入图片、`character__fallback` 触发 0 次，3D 与 2D 两版均无白底方块；据此微调了毕方伴飞尺寸与引导气泡间距。
- 无障碍对比度：正文 8.54:1、次要文字 4.54:1、朱砂链接 5.17:1、CTA 5.83:1、石壁刻字 5.62:1、石壁状态小字 4.63:1，全部达 AA。
- 键盘可达：殿阁标签、罗盘节点、石壁（tabindex / Enter / Esc）、卷轴按钮全通路；`prefers-reduced-motion` 关飞行与动画。
- `dist/` 扫描无 `image-request.json`、无临时签名链接。
- v0.4 追加：`?mode=static&cursor=demo` 与 `?mode=webgl2&cursor=demo` 两条路径的无头 Edge 截图均正常，侠客光标在浅米 2D 与青绿 3D 底上都清晰、无白底方块；`--dump-dom` 确认 `body.has-sword-cursor` 与 `.sword-cursor` 节点挂载，CSS 变量（1200ms / scale 0.95 / hover 1.064）写入正确；sprite 8 帧透明 bbox 与像素哈希两两不同，帧右边缘统一落在 x=76（剑尖对齐）；9 份配置 JSON 全部校验通过。
- **v0.5 追加**：`npm run build` 83 modules 通过；10 份配置 JSON 全部有效；`dist/` 无签名链接。按 390×844 手机画幅做了 5 张无头验收截图（`references/V12_mobile_fallback/verify-*.png`）：小地图 8 落点全部可见且 4 个红圈精确套住原图亭子光晕、巡游视差 + 小师妹 + 三段式 HUD、卷轴竖屏单栏（摇杆自动隐藏）、巡毕面板、M1 真 3D（SwiftShader 下 canvas 正常挂载、牌坊不穿模）。`?mode=m1` 的 DOM 检查确认 `<canvas>` 存在、无 `data-tour-error`。
- 竖屏截图方法：headless Edge 最小窗口宽度为 500px，用 `--window-size=500,844` + `portrait.css` 的 390px 居中手机框，再裁剪中间 390px 得到精确手机画幅；直接给 390 会被浏览器放大到 500 导致右侧误裁。

## 下一步（等素材 / 等确认）

1. **M01–M08 逐项拍板**，尤其 **M02**（手机默认是否跑真 3D）与 **M05**（要不要 10s 自动收卷）；确认后回填云端规格书第 14 章并按结论改 `tour.json`。
2. C10 联系邮箱真实地址 → 改 `site.json`，CTA 立刻生效。
3. V04 殿阁参考图 → Lux3D 图生 3D → 减面 ≤3 万面 → 替换 `createPavilionMarkers()` 的返回值；**这也是把 M1 设为手机默认的前置条件**（当前程序化低多边形贴地看不够精致）。
4. V07 / V09 / V11 / V14 参考图 → 逐个替换 2D 占位与线稿（V05 / V06 / V08 / V12 已上线）。另可补 V05 表情差分与三视图，做「引路 / 等待 / 乖巧退场」三态。
5. V12 横屏版、V15（HUD / 摇杆 / 小地图视觉参考，M08）仍缺；陀螺仪转头排 v1.1。
4. 真实案例例图放 `public/assets/cases/`：`<img>` 已写 `@error` 兜底，图放进同名路径即自动接管，不用改代码。
5. WebGPU 渐进增强：`RendererAdapter` 已留探测位，实现 WGSL 后在 `selectBackend` 放开 `'webgpu'` 分支。
6. 上线前补 canonical / sitemap / 真实 OG 图（当前 `og-image.png` 是程序化占位）。

## 部署检查清单（静态托管）

1. `npm run build` 通过，`dist/` 主包 < 1.5 MB（three 已单独切 chunk）。
2. `base: './'` 已设为相对路径，可挂任意子目录；若用自定义域名根路径，改成 `/`。
3. 确认 `dist/` 里**没有** `image-request.json` 与任何密钥 / 临时签名链接。
4. 移动端验收：默认走 2D 文字版、热区与卷轴可用、`100dvh` 无溢出。
5. 回滚：保留上一版 `dist/` 静态产物，托管平台切回上一发布版本即可，无数据库迁移。
