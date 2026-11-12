# references/ — 视觉参考图目录

> 对应规格书：`颜如玉OPC主页_开发规格书_v2.md` 第 11 章
> 你（颜如玉）后续把参考图直接丢进对应目录即可，不需要改代码。

## 怎么用（三步）

1. 找到下表对应的 `Vxx_` 目录，把图放进去，按 `naming` 规则命名。
2. 打开 `reference-mapping.json`，把该项的 `status` 从 `pending` 改成 `ready`。
3. 开发侧按 `consumedBy` 里写的文件与参数做人工标定。未放图的目录照常构建，组件走兜底默认值。

**已定稿/已确认的项**：V13（主张文案，已写 `claim.txt`）、V05 / V06 / V08 / V12（**已给图并已上线**）、V11（石壁方向已定，待给图）、V14（观星台先占位，待给图）。

## 目录速查

| 目录 | 内容 | 优先级 | 状态 |
|---|---|---|---|
| `V01_moodboard` | 全站色调与氛围情绪板 | P0 | **ready**（mood-master.png，已取色） |
| `V02_yan_glyph` | 手写「颜」字 / 碑帖 + 笔势对照图 | P0 | **ready**（yan-reference.jpg） |
| `V03_kunlun_peak` | 昆仑主峰山形 | P0 | **ready**（kunlun-01.jpg） |
| `V04_pavilion_arch` | 殿阁飞檐斗拱（**Lux3D 图生 3D 输入**） | P0 | 待提供 |
| `V05_shimei_character` | 小师妹立绘 / 三视图 / 表情 | P0 | **ready**（shimei-front.source.jpg，已上线） |
| `V06_cursor_swordsman` | 御剑侠客 8 帧序列 + 淡金法术拖尾 | P1 | **ready**（transparent 雪碧图，已切帧上线） |
| `V07_talisman_fx` | 符箓 / 手诀 / 转场特效 | P1 | 待提供 |
| `V08_beasts_2d` | 烛龙 / 精卫 / 毕方 / 鹿蜀，**2D 动画风** | P1 | **ready**（4 张 source.jpg，已上线） |
| `V09_scroll_layout` | 卷轴内页版式 | P1 | 待提供 |
| `V10_seal_signature` | 「颜如玉」落款 + 朱砂印 | P1 | 待提供 |
| `V11_case_stone` | 刻红字大石 + 白雾质感 | P1 | 方向已定，待给图 |
| `V12_mobile_fallback` | **竖屏第一人称巡游背景**（9:16 山海 + 4 亭） | P0 | **ready**（shanhai-mood-master.source.jpg，已上线） |
| `V13_claim_copy` | 山门主张 `claim.txt` | P0 | **已定稿** |
| `V14_observatory_evidence` | 观星台 demo 展示图 | P2 | 预留占位 |

## 命名与格式

- 文件名：小写英文 + 连字符 + 两位序号，如 `mood-01.jpg`、`pavilion-02.png`
- 格式：`jpg / png / webp / svg / gif / mp4`
- V04 特别注意：给 Lux3D 的图要**单体、背景干净、无人物**，正交或三分之四视角，否则生成会跑偏
- V05 / V08 注意：要 **2D**，不要 3D 渲染图（规格书 2.3.1 / A15 硬约束）

## MAPPING 配置

`reference-mapping.json` 是机器可读的唯一索引，每项字段：

| 字段 | 含义 |
|---|---|
| `id` / `dir` / `title` | 编号、目录、名称 |
| `expect` / `naming` / `specHint` | 要放什么、怎么命名、尺寸与规格提示 |
| `status` | `pending` / `ready` / `decided` |
| `priority` | P0 / P1 / P2 |
| `decision` | 已确认的决策（C01/C04/C05/C08 等） |
| `consumedBy[]` | **这张图配置在哪里**：文件路径 + 具体参数 / 组件 + 备注 |

## 角色资产处理链路（V05 / V08）

用户给的 5 张是**白底 JPEG**——原本是透明底 PNG，另存时把浅灰棋盘格一起画进去了。四兽（V08）仍带棋盘格；
**小师妹（V05）已在 2026-11-12 换成干净白底版（1920×1920，无棋盘格、无水印，新姿态：双臂外展 + 指尖青绿法术旋涡）**。
无论哪种，直接贴到青碧山体上都会糊出白方块，所以有一层离线处理：

```
references/V05_shimei_character/shimei-front.source.jpg          （已干净，无棋盘格 / 无水印）
references/V08_beasts_2d/{lushu,jingwei,bifang,zhulong}.source.jpg （仍带浅灰棋盘格）
        │  tools/images/prepare_characters.py
        │  · 抹水印（历史小师妹版本曾需要；现源图已干净，JOBS 里 shimei 的 erase_watermark 已置 False）
        │  · 连通域从画布边缘判定外部中性亮色（白格 + 浅灰棋盘格一起清掉）
        │  · 墨线围住的内部白色（白裙 / 马身 / 龙腹）保留
        │  · 2px 羽化、裁 bbox、等比缩放进透明正方形（小师妹 512、四兽 320）
        ▼
public/assets/characters/{shimei,lushu,jingwei,bifang,zhulong}.webp
        │  src/ui/CharacterImage.vue（统一入口，@error 回落内联 SVG）
        ▼
GuideShimei / PortraitBackdrop（竖屏巡游）/ BeastBar / CompassMap / StaticFallback
```

复跑（换形象、加表情差分、拿到真透明 PNG 时）：

```bash
# 依赖仅用于离线工具，不进前端构建
python -m pip install Pillow numpy scipy
python tools/images/prepare_characters.py
```

脚本会在系统临时目录吐一张 `shanhai_characters_preview.png` 拼图（浅米底 + 青绿底各一排），**先目视确认再提交资产**。

四兽对应《山海经》特征的判断写在 `reference-mapping.json` 的 `V08.beastNote`：马身虎纹赤鬃=鹿蜀、白喙赤足=精卫、一足青质鹤形=毕方、青龙金角=烛龙。若原意不同，只改文件名与 `beast` 字段，组件按 `name` 取图、不用改代码。

已知限制：毕方白身与背景几乎同色，去底后在深色底上略透，因此只用在浅米纸控件和带月白柔光的伴飞位；拿到真透明 PNG 源图重跑即可消除。详见 `V08.knownLimit`。

## 光标资产处理链路（V06）

V06 给的是**一张 5472×3072 的 RGBA 八帧雪碧图**（已去白底），不是 8 个独立文件，也不是等宽网格：8 帧沿 x 近似等距、沿 y 有「起 → 抬 → 最高 → 落 → 沉 → 最低 → 再起 → 回位」的起伏。因此按 `5472/8` 硬切会把头或剑切掉。

```
V06_cursor_swordsman/ancient_swordsman_flight_sheet_transparent.png
        │  tools/images/prepare_cursor.py
        │  · alpha>60 连通域 → 恰好 8 个人物主体块（含各自淡金光带），按 x 排序
        │  · 统一缩放 / 右边缘（剑尖）对齐 / 原始 cy 压缩成 dy 烘焙进 80×80 格子
        ▼
src/assets/cursor/swordsman-sheet.png（640×80）+ swordsman-static.png + 01..08 单帧
        │  src/config/cursor.json（几何字段脚本生成，节奏与缩放可手调）
        ▼
src/ui/SwordCursor.vue（steps(8) 循环）+ src/styles/cursor.css + base.css 原生兜底
```

脚本另吐两张人工验收图到本目录：`cursor-preview.png`（8 帧拼图 + 帧号）与 `cursor-loop.gif`（2× 循环动图）。**换形象后先看这两张再决定上不上线**。完整说明与双层光标降级策略见工程根 `README.md`「V06 光标处理链路」。

## 竖版背景处理链路（V12）

给的是一张 **1077×1920 / 219 KB 的 9:16 水彩竖版**，不是横版降级图的裁切版。图里自带 4 座带浅色光晕的亭子，正好当小地图落点，所以先用朱红像素连通域实测圆心（不是目测）：

```
(30.5%, 24.4%) 左上   (87.1%, 23.1%) 右上
(20.1%, 55.9%) 左中   (85.2%, 65.4%) 右下
```

```
V12_mobile_fallback/shanhai-mood-master.source.jpg
        │  tools/images/prepare_portrait.py
        │  · 全幅 WebP 115 KB（画质 84）
        │  · 36×64 LQIP 0.4 KB（首屏 1s 内出图，双层 img 叠放，不靠 JS 判 load）
        │  · 裁下 38% 做带 alpha 的云海前景 29.5 KB（近景视差层）
        │  · 按 8 个落点画一张 portrait-hotspots-preview.png 供人工验收
        ▼
public/assets/portrait/*.webp
        │  src/config/tour.json（图片路径 + 落点 + 视差幅度 + 节奏 + HUD 文案）
        ▼
TourStartMap（进场小地图）/ PortraitBackdrop（M0 第一人称）/ portrait.css
```

**两个容易踩的坑**：① 背景用 `object-fit: fill` 与落点层同比拉伸，改回 `cover` 会让 x 坐标漂移、红圈套不住亭子；② 山门落点原设在 y=88%，会被底部操作条压住，现已上移到 74% 且殿名翻到圈上方。换图后重跑脚本并重新标定 `tour.json` 的 `spawnPoints`。

M1 真 3D 巡游不消费这张图，它用程序化地形；但低帧率降级时会无缝回到这张竖版，进度不丢。

## 代码内注释规范（强制）

每个消费参考图的组件顶部必须留 `[REF Vxx]` 注释，便于你日后单独换图时定位：

```ts
// [REF V04] 殿阁建筑参考 → references/V04_pavilion_arch/
// 用途：飞檐角度 / 斗拱密度 / 木构配色按该目录参考图人工标定
// 配置源：references/reference-mapping.json → V04.consumedBy
// 状态：pending（参考图未提供前，使用 tokens.css 中的临时色值）
const PAVILION_STYLE = { eave: 0.42, bracket: 2 }
```

多个参考图共同影响同一组件时，逐行列出：

```ts
// [REF V01] 色板 → src/styles/tokens.css
// [REF V11] 石壁形制与白雾 → src/ui/CaseMist.ts
// [REF V07] 空态符箓 → src/ui/fx/ClickFeedback.ts
```

## 不改动的原则

- 放图、改 `status` 之外，**不改组件代码**
- 参考图缺失时所有组件都有兜底默认值，构建不报错、页面不空
- 全站姓名统一「颜如玉」，参考图里若出现其他姓名需替换

## 用 AI 生成参考图

`生成提示词_MiniMax_H3.md` 里有 10 张 MiniMax H3-Image 提示词，按 Vxx 编号一一对应本目录。
**核心工作流**：先出 V01 情绪板当母版存为 `V01_moodboard/mood-master.png`，后面 9 张都把它传进参考图区，保证全套调性统一。V02 / V04 / V13 / V14 不建议用 AI 生，原因见该文件第 1 节。

**外部灵感图**（花瓣 / Pinterest / 古画站截来的参考）放 `_inspiration/`：该目录**不参与 MAPPING、不打包上线、不被代码消费**，只作你自己校准审美和 H3 垫图用。素材站清单、垫图影响机制与护栏句见 `生成提示词_MiniMax_H3.md` 第 0A 节。V01 母版建议纯文生图、不垫外部成品图。
