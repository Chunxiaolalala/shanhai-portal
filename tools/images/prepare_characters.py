#!/usr/bin/env python3
"""[REF V05][REF V08] 角色参考图 -> 运行时透明 WebP 资产。

用途：用户提供的参考图是白底 JPEG（早期版本小师妹还带浅灰棋盘格 + 右下角 AI 水印，
现已换成干净白底版），直接贴到青碧山体上会糊出白方块。本脚本做三件事：

  1. 四向连通域从画布边缘判定「外部白底」——被墨线围住的内部白色（白裙、白腹、眼白）会保留；
  2. 边缘 2px 羽化，避免水彩渐变处出现硬白边；
  3. 裁到主体 bbox、等比缩放进透明正方形画布，导出 WebP。

不在构建流程里跑，也不进 dist；换参考图后手动执行一次即可：

    python tools/images/prepare_characters.py

依赖：Pillow + numpy + scipy（仅离线工具，不进前端构建）。
输出 public/assets/characters/*.webp（Vite 原样拷贝到 dist 根）。

注意：背景白底不能只靠全局阈值或逐行扫描（会漏掉灰格、留下规则白条、或误删白裙），
必须从画布边缘用连通域扩散；被墨线隔断的主体白色标签不同，自然保留。
"""

from __future__ import annotations

import os
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
REFS = ROOT / "references"
OUT = ROOT / "public" / "assets" / "characters"

# name -> (参考图相对路径, 输出边长, 是否抹水印)
# 小师妹是主角，边长给到 512 保证视网膜屏下指尖法术旋涡仍清晰；
# 新源图已是干净白底（无棋盘格、无水印），故不再抹水印。
JOBS: list[tuple[str, str, int, bool]] = [
    ("shimei", "V05_shimei_character/shimei-front.source.jpg", 512, False),
    ("lushu", "V08_beasts_2d/lushu.source.jpg", 320, False),
    ("jingwei", "V08_beasts_2d/jingwei.source.jpg", 320, False),
    ("bifang", "V08_beasts_2d/bifang.source.jpg", 320, False),
    ("zhulong", "V08_beasts_2d/zhulong.source.jpg", 320, False),
]

# 背景候选：高亮度 + 低饱和的中性色（纯白底 + 浅灰棋盘格都算）
WHITE_MIN = 200
WHITE_CHROMA = 26
FEATHER = 2  # 边缘羽化像素


def background_mask(arr: np.ndarray) -> np.ndarray:
    """从画布边缘连通进来的中性亮色 = 背景。

    用 4-连通标记而非逐行扫描：棋盘格灰格 / 翅膀围出的 U 形空隙
    都能沿曲折路径连回边缘；主体内部的白身被墨线隔断，标签不同，保留。
    """
    mn = arr.min(axis=2)
    mx = arr.max(axis=2)
    neutral = (mn > WHITE_MIN) & ((mx - mn) < WHITE_CHROMA)

    labels, count = ndimage.label(
        neutral, structure=np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]], dtype=bool)
    )
    if count == 0:
        return np.zeros(neutral.shape, dtype=bool)

    edge_labels = np.unique(
        np.concatenate([labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]])
    )
    edge_labels = edge_labels[edge_labels > 0]
    return np.isin(labels, edge_labels)


def alpha_from_mask(arr: np.ndarray, bg: np.ndarray) -> np.ndarray:
    """确定背景 alpha=0；外扩 FEATHER 像素按白度给半透明，压掉硬白边。"""
    h, w = bg.shape
    grown = bg.copy()
    for _ in range(FEATHER):
        g = grown.copy()
        g[1:, :] |= grown[:-1, :]
        g[:-1, :] |= grown[1:, :]
        g[:, 1:] |= grown[:, :-1]
        g[:, :-1] |= grown[:, 1:]
        grown = g

    mn = arr.min(axis=2).astype(np.float32)
    mx = arr.max(axis=2).astype(np.float32)
    # 越接近纯白越透明（(mn-200)/55 在 200..255 间映射到 0..1）
    whiteness = np.clip((mn - 200.0) / 55.0, 0.0, 1.0)
    whiteness *= np.clip(1.0 - (mx - mn) / 60.0, 0.0, 1.0)

    alpha = np.full((h, w), 255.0, dtype=np.float32)
    edge = grown & ~bg
    alpha[edge] = 255.0 * (1.0 - whiteness[edge] * 0.85)
    alpha[bg] = 0.0
    return np.clip(alpha, 0, 255).astype(np.uint8)


def prepare(name: str, rel: str, size: int, erase_watermark: bool) -> dict:
    src = REFS / rel
    if not src.exists():
        raise FileNotFoundError(src)

    im = Image.open(src).convert("RGB")
    if erase_watermark:
        # 水印位于右下角，主体（鞋、飘带）都不在这个矩形内
        w, h = im.size
        ImageDraw.Draw(im).rectangle(
            [int(w * 0.78), int(h * 0.925), w, h], fill=(255, 255, 255)
        )

    arr = np.asarray(im).astype(np.int16)
    bg = background_mask(arr)
    alpha = alpha_from_mask(arr, bg)

    rgba = Image.fromarray(np.dstack([arr.astype(np.uint8), alpha]), "RGBA")

    # 裁到主体，留 3% 呼吸空间
    bbox = rgba.getchannel("A").point(lambda v: 255 if v > 12 else 0).getbbox()
    if bbox is None:
        raise RuntimeError(f"{name}: 抠图后为空，检查白底阈值")
    pad = int(max(bbox[2] - bbox[0], bbox[3] - bbox[1]) * 0.03)
    x0, y0, x1, y1 = bbox
    rgba = rgba.crop(
        (max(0, x0 - pad), max(0, y0 - pad), min(rgba.width, x1 + pad), min(rgba.height, y1 + pad))
    )

    # 等比缩放进透明正方形，避免组件里宽高不定
    scale = size / max(rgba.size)
    rgba = rgba.resize(
        (max(1, round(rgba.width * scale)), max(1, round(rgba.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(rgba, ((size - rgba.width) // 2, (size - rgba.height) // 2), rgba)

    OUT.mkdir(parents=True, exist_ok=True)
    dest = OUT / f"{name}.webp"
    canvas.save(dest, "WEBP", quality=90, method=6, exact=True)

    a = np.asarray(canvas.getchannel("A"))
    return {
        "name": name,
        "size": size,
        "transparent_pct": round(float((a < 8).mean()) * 100, 1),
        "bytes": dest.stat().st_size,
        "src": rel,
        "out": str(dest.relative_to(ROOT)).replace("\\", "/"),
        "preview": canvas,
    }


def main() -> None:
    results = [prepare(*job) for job in JOBS]

    # 预览拼图：深 / 浅两种底各一排，检查白边与主体完整性
    tile = 220
    sheet = Image.new("RGB", (tile * len(results), tile * 2), "#8eaca2")
    sheet_top = Image.new("RGB", (tile * len(results), tile), "#f0e5ca")
    sheet.paste(sheet_top, (0, 0))
    for i, r in enumerate(results):
        thumb = r["preview"].resize((tile, tile), Image.Resampling.LANCZOS)
        sheet.paste(thumb, (i * tile, 0), thumb)
        sheet.paste(thumb, (i * tile, tile), thumb)
    preview = Path(os.environ.get("TEMP", "/tmp")) / "shanhai_characters_preview.png"
    sheet.save(preview)

    print(f"{'name':<10} {'size':>6} {'transparent':>12} {'bytes':>9}  out")
    for r in results:
        print(
            f"{r['name']:<10} {r['size']:>6} {r['transparent_pct']:>11.1f}% "
            f"{r['bytes']:>9}  {r['out']}"
        )
    print(f"PREVIEW={preview}")


if __name__ == "__main__":
    main()
