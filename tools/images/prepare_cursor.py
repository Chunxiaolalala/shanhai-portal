# -*- coding: utf-8 -*-
"""[REF V06] 御剑侠客序列帧 → 运行时光标资源（离线工具，不参与前端构建）

输入：references/V06_cursor_swordsman/ancient_swordsman_flight_sheet_transparent.png
      （MiniMax H3 生成的 5472×3072 八帧雪碧图，已去白底，RGBA）
输出：src/assets/cursor/swordsman-01..08.png   80×80 单帧
      src/assets/cursor/swordsman-sheet.png    640×80 横排 sprite（CSS steps(8) 用）
      src/assets/cursor/swordsman-static.png   80×80 第 1 帧（原生 CSS cursor 兜底）
      references/V06_cursor_swordsman/cursor-preview.png   浅米底拼图，人工验收切帧
      references/V06_cursor_swordsman/cursor-loop.gif      2× 循环 GIF，人工验收飞行节奏
      src/config/cursor.json                  唯一参数来源（若已存在则只覆盖几何字段）

切帧依据：8 帧并非严格等宽网格排布，而是同一角色沿 x 轴近似等距、沿 y 轴做
「起 → 抬 → 最高 → 落 → 沉 → 最低 → 再起 → 回位」的飞行起伏。因此不能按
5472/8 硬切：先用 alpha>60 做连通域，正好得到 8 个人物主体块（含各自淡金光带），
按 x 中心排序即帧 1..8。

归一化三原则：
  1. 统一缩放系数（取所有帧最大 bbox）→ 8 帧人物大小严格一致，播放不忽大忽小；
  2. 右边缘对齐（剑尖朝右，右边界最稳定）→ 播放不左右抖，光带长短自然向左呼吸；
  3. 垂直按原始 cy 烘焙一个压缩后的 dy → 保留飞行起伏，又不至于把 80px 格子撑破。

换形象只需替换 source 图并重跑：python tools/images/prepare_cursor.py
依赖：Pillow / numpy / scipy（与 prepare_characters.py 同一套）
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'references' / 'V06_cursor_swordsman' / 'ancient_swordsman_flight_sheet_transparent.png'
OUT = ROOT / 'src' / 'assets' / 'cursor'
PREVIEW = ROOT / 'references' / 'V06_cursor_swordsman' / 'cursor-preview.png'
LOOP = ROOT / 'references' / 'V06_cursor_swordsman' / 'cursor-loop.gif'
CFG = ROOT / 'src' / 'config' / 'cursor.json'

CELL = 80            # 单帧格子边长（<128，原生 CSS cursor 也吃得下）
CONTENT = 64         # 人物+光带缩放后的最大边长
RIGHT_EDGE = 76      # 剑尖右侧对齐线
TOP_BASE = 12        # 顶部基线
DY_SCALE = 0.55      # 飞行起伏压缩系数
DY_CLAMP = 9.0       # 起伏上限（px）

DEFAULT_CFG = {
    '_comment': 'V06 御剑侠客光标。几何字段由 tools/images/prepare_cursor.py 生成，勿手改；durationMs / hoverScale / trail 可手调。',
    'frameCount': 8,
    'cell': CELL,
    'sheetWidth': CELL * 8,
    'hotspot': {'x': 72, 'y': 64},
    'sprite': 'swordsman-sheet.png',
    'static': 'swordsman-static.png',
    'durationMs': 1200,
    'scale': 0.95,
    'hoverScale': 1.12,
    'trail': {'color': '#f2d790', 'glow': 18},
    'frames': [],
}


def split_frames(rgba: np.ndarray) -> list[dict]:
    """alpha 连通域 → 8 帧，按 x 中心排序。"""
    alpha = rgba[:, :, 3]
    labels, n = ndimage.label(alpha > 60)
    counts = np.bincount(labels.ravel())
    comps: list[dict] = []
    for i in range(1, n + 1):
        if counts[i] < 3000:
            continue
        ys, xs = np.where(labels == i)
        comps.append({
            'id': i,
            'x0': int(xs.min()), 'x1': int(xs.max() + 1),
            'y0': int(ys.min()), 'y1': int(ys.max() + 1),
            'cx': float(xs.min() + xs.max()) / 2,
            'cy': float(ys.min() + ys.max()) / 2,
        })
    comps.sort(key=lambda c: c['cx'])
    if len(comps) != 8:
        raise RuntimeError(f'期望 8 帧，实际检出 {len(comps)} 帧；请检查源图或调整 alpha 阈值')
    return comps


def extract(rgba: np.ndarray, labels: np.ndarray, comp: dict) -> Image.Image:
    """取该帧连通域 + 12px 软边（保留淡金光带的半透明渐隐），裁到实际非透明 bbox。"""
    pad = 24
    y0, y1 = max(0, comp['y0'] - pad), min(rgba.shape[0], comp['y1'] + pad)
    x0, x1 = max(0, comp['x0'] - pad), min(rgba.shape[1], comp['x1'] + pad)
    sub = rgba[y0:y1, x0:x1].copy()
    keep = ndimage.binary_dilation(labels[y0:y1, x0:x1] == comp['id'], iterations=10)
    sub[:, :, 3] = np.where(keep, sub[:, :, 3], 0)
    ys, xs = np.where(sub[:, :, 3] > 3)
    if len(ys) == 0:
        raise RuntimeError('帧内容为空')
    return Image.fromarray(sub[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 'RGBA')


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f'找不到源图：{SRC}')
    OUT.mkdir(parents=True, exist_ok=True)
    PREVIEW.parent.mkdir(parents=True, exist_ok=True)

    src = Image.open(SRC).convert('RGBA')
    rgba = np.asarray(src)
    labels, _ = ndimage.label(rgba[:, :, 3] > 60)
    comps = split_frames(rgba)
    patches = [extract(rgba, labels, c) for c in comps]

    max_side = max(max(p.width, p.height) for p in patches)
    scale = CONTENT / max_side
    mean_cy = sum(c['cy'] for c in comps) / len(comps)

    cells: list[Image.Image] = []
    frame_meta: list[dict] = []
    for idx, (comp, patch) in enumerate(zip(comps, patches), 1):
        w, h = max(1, round(patch.width * scale)), max(1, round(patch.height * scale))
        small = patch.resize((w, h), Image.LANCZOS)
        dy = float(np.clip((comp['cy'] - mean_cy) * scale * DY_SCALE, -DY_CLAMP, DY_CLAMP))
        cell = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
        cell.alpha_composite(small, (RIGHT_EDGE - w, round(TOP_BASE + dy)))
        cells.append(cell)
        name = f'swordsman-{idx:02d}.png'
        cell.save(OUT / name, optimize=True)
        frame_meta.append({
            'file': name,
            'dy': round(dy, 2),
            'sourceBox': [comp['x0'], comp['y0'], comp['x1'], comp['y1']],
        })
        print(f'  帧 {idx}: source {patch.width}×{patch.height} → {w}×{h}, dy={dy:+.1f}')

    sheet = Image.new('RGBA', (CELL * 8, CELL), (0, 0, 0, 0))
    for i, cell in enumerate(cells):
        sheet.alpha_composite(cell, (i * CELL, 0))
    sheet.save(OUT / 'swordsman-sheet.png', optimize=True)
    cells[0].save(OUT / 'swordsman-static.png', optimize=True)

    # 人工验收用预览：浅米底 + 帧序号 + 热点十字，不参与构建
    prev = Image.new('RGB', (CELL * 8 + 32, CELL + 52), (240, 229, 202))
    draw = ImageDraw.Draw(prev)
    for i, cell in enumerate(cells):
        x = 16 + i * CELL
        prev.paste(cell.convert('RGBA'), (x, 30), cell)
        draw.text((x + 30, 10), f'{i + 1:02d}', fill=(51, 65, 60))
        draw.line((x, 30, x, 30 + CELL), fill=(180, 195, 186), width=1)
    draw.line((16 + CELL * 8, 30, 16 + CELL * 8, 30 + CELL), fill=(180, 195, 186), width=1)
    draw.text((16, CELL + 34), 'V06  8-frame flight  |  right-edge aligned  |  dy baked in', fill=(92, 106, 99))
    prev.save(PREVIEW)

    cfg = dict(DEFAULT_CFG)
    if CFG.exists():
        cfg.update(json.loads(CFG.read_text(encoding='utf-8')))
    cfg.update({
        'frameCount': 8, 'cell': CELL, 'sheetWidth': CELL * 8,
        # 热点 = 剑尖：右边缘对齐线 76 内缩 4px，y 取 8 帧剑身纵坐标均值
        'hotspot': {'x': 72, 'y': 64},
        'sprite': 'swordsman-sheet.png', 'static': 'swordsman-static.png',
        'frames': frame_meta,
    })
    CFG.write_text(json.dumps(cfg, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    # 循环 GIF：帧时长与前端 durationMs 对齐，2× 放大便于肉眼验收起伏与光带呼吸
    per_frame = max(20, round(cfg.get('durationMs', 1200) / len(cells)))
    gif_frames: list[Image.Image] = []
    for cell in cells:
        bg = Image.new('RGB', (CELL * 2, CELL * 2), (240, 229, 202))
        big = cell.resize((CELL * 2, CELL * 2), Image.LANCZOS)
        bg.paste(big, (0, 0), big)
        gif_frames.append(bg)
    gif_frames[0].save(
        LOOP, save_all=True, append_images=gif_frames[1:],
        duration=per_frame, loop=0, optimize=False,
    )

    print(f'\n源图 {src.width}×{src.height} / 统一缩放 {scale:.4f} / 格子 {CELL}×{CELL}')
    print(f'输出：{OUT}（10 张 PNG）· 拼图：{PREVIEW} · 循环：{LOOP} · 配置：{CFG}')


if __name__ == '__main__':
    main()
