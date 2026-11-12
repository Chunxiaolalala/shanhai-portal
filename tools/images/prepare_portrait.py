"""[REF V12] 竖版 9:16 山海背景 → 运行时资产（离线工具，可复跑）。

输入：references/V12_mobile_fallback/shanhai-mood-master.source.jpg（用户原图，1077×1920）
输出：
  public/assets/portrait/shanhai-portrait.webp          全幅背景（首屏 1s 内出图的主体）
  public/assets/portrait/shanhai-portrait-lqip.webp     36×64 极低清占位，高清加载前先铺底
  public/assets/portrait/shanhai-foreground.webp        云海前景层（带 alpha，做视差纵深）
  references/V12_mobile_fallback/portrait-hotspots-preview.png   热点坐标人工验收图

4 个亭子的圆心由朱红像素连通域实测（不是目测）：
  (30.5%, 24.4%) 左上 / (87.1%, 23.1%) 右上
  (20.1%, 55.9%) 左中 / (85.2%, 65.4%) 右下
这 4 个点在 tour.json 里被 4 座殿阁复用，小地图节点正好套进原图的浅色光晕。

换图：覆盖 .source.jpg 后重跑本脚本即可，组件与 tour.json 不用动（坐标需重新标定）。
"""
from __future__ import annotations

import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
REF = ROOT / 'references' / 'V12_mobile_fallback'
OUT = ROOT / 'public' / 'assets' / 'portrait'
SOURCE = REF / 'shanhai-mood-master.source.jpg'

# 小地图 / 巡游落点，百分比坐标；前 4 个对齐原图亭子
SPAWNS: list[tuple[str, str, float, float]] = [
    ('shan-men', '山门', 48.0, 74.0),
    ('yanan-ge', '验案阁', 20.1, 55.9),
    ('tiangong-fang', '天工坊', 85.2, 65.4),
    ('yinke-tai', '引客台', 30.5, 24.4),
    ('lingshu-dian', '灵枢殿', 87.1, 23.1),
    ('guanxing-tai', '观星台', 50.0, 36.0),
    ('cangjing-ge', '藏经阁', 13.0, 70.0),
    ('chuanshu-ting', '传书亭', 70.0, 48.0),
]


def font(size: int) -> ImageFont.ImageFont:
    for candidate in ('C:/Windows/Fonts/msyh.ttc', 'C:/Windows/Fonts/simhei.ttf'):
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def main() -> None:
    if not SOURCE.exists():
        # 首次运行：从 WorkBuddy 剪贴板目录取用户刚给的那张图
        candidates = sorted(
            (Path.home() / '.workbuddy' / 'clipboard-images').glob('*.jpg'),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if not candidates:
            raise SystemExit(f'找不到源图，请先把竖版背景放到 {SOURCE}')
        REF.mkdir(parents=True, exist_ok=True)
        shutil.copy2(candidates[0], SOURCE)
        print(f'归档源图：{candidates[0].name} → {SOURCE}')

    OUT.mkdir(parents=True, exist_ok=True)
    im = Image.open(SOURCE).convert('RGB')
    w, h = im.size
    ratio = w / h
    if abs(ratio - 9 / 16) > 0.02:
        print(f'提示：源图比例 {ratio:.4f}，并非严格 9:16（{w}×{h}），仍按 cover 使用')

    full = OUT / 'shanhai-portrait.webp'
    im.save(full, 'WEBP', quality=84, method=6)

    lqip = OUT / 'shanhai-portrait-lqip.webp'
    im.resize((36, 64), Image.Resampling.LANCZOS).save(lqip, 'WEBP', quality=42, method=6)

    # 云海前景：裁下 38% 的画面，顶部 60% 高度做 alpha 渐隐，叠在背景上形成近远两层
    top = int(h * 0.62)
    crop = im.crop((0, top, w, h)).convert('RGBA')
    ch = crop.height
    ramp = np.clip(np.linspace(0, 1, int(ch * 0.62)), 0, 1)
    column = np.concatenate([
        (ramp * 255).astype(np.uint8),
        np.full(ch - len(ramp), 255, dtype=np.uint8),
    ])
    alpha = np.broadcast_to(column[:, None], (ch, w)).astype(np.uint8)
    crop.putalpha(Image.fromarray(alpha, mode='L'))
    foreground = OUT / 'shanhai-foreground.webp'
    crop.save(foreground, 'WEBP', quality=78, method=6)

    # 人工验收图：缩到 540×963，画出 4 个原图亭子圈 + 8 个巡游落点
    scale = 540 / w
    preview = im.resize((540, int(h * scale)), Image.Resampling.LANCZOS).convert('RGB')
    draw = ImageDraw.Draw(preview, 'RGBA')
    f_small = font(15)
    f_big = font(19)
    for i, (pid, name, x, y) in enumerate(SPAWNS):
        cx, cy = int(preview.width * x / 100), int(preview.height * y / 100)
        aligned = i in (1, 2, 3, 4)
        color = (168, 55, 42, 255) if aligned else (51, 65, 60, 255)
        draw.ellipse((cx - 21, cy - 21, cx + 21, cy + 21), outline=color, width=2)
        draw.ellipse((cx - 5, cy - 5, cx + 5, cy + 5), fill=color)
        label = f'{i} {name}'
        box = draw.textbbox((0, 0), label, font=f_small)
        tw = box[2] - box[0]
        lx = cx + 24 if cx + 24 + tw < preview.width - 6 else cx - 24 - tw
        draw.text((lx, cy - 9), label, font=f_small, fill=(51, 65, 60, 255))
    draw.text((18, 14), 'V12 竖版落点标定 · 红圈=原图亭子光晕 / 墨圈=云海补点',
              font=f_big, fill=(51, 65, 60, 255))
    preview_path = REF / 'portrait-hotspots-preview.png'
    preview.save(preview_path)

    for path in (SOURCE, full, lqip, foreground, preview_path):
        print(f'  {path.relative_to(ROOT)}  {path.stat().st_size / 1024:.1f} KB')
    print(f'源图 {w}×{h} → 背景 / LQIP / 云海前景 / 落点预览 已生成')


if __name__ == '__main__':
    main()
