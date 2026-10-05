#!/usr/bin/env python3

from pathlib import Path
import re

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
APP = ROOT / "src" / "app"
SOURCE_LOGO = PUBLIC / "brand" / "v1" / "symbol-gradient-512.png"
BRAND_MASTERS = ROOT.parent.parent / "assets" / "brand" / "masters"
ADMIN_PUBLIC = ROOT.parent / "admin" / "public"

MIDNIGHT = (5, 9, 16, 255)
TRANSPARENT = (0, 0, 0, 0)


def load_source_logo() -> Image.Image:
    if not SOURCE_LOGO.is_file():
        raise FileNotFoundError(f"Run scripts/branding/export-brand-assets.py first: {SOURCE_LOGO}")
    return Image.open(SOURCE_LOGO).convert("RGBA")


def resize_logo(logo: Image.Image, width: int, height: int) -> Image.Image:
    return logo.resize((width, height), Image.Resampling.LANCZOS)


def render_logo_icon(
    size: int,
    *,
    background: tuple[int, int, int, int],
    padding_ratio: float,
    fit: str = "contain",
) -> Image.Image:
    logo = load_source_logo()
    canvas = Image.new("RGBA", (size, size), background)
    max_size = int(size * (1 - (padding_ratio * 2)))

    if fit == "cover":
        scale = max(max_size / logo.width, max_size / logo.height)
    else:
        scale = min(max_size / logo.width, max_size / logo.height)

    logo = resize_logo(
        logo,
        max(1, round(logo.width * scale)),
        max(1, round(logo.height * scale)),
    )

    left = (size - logo.width) // 2
    top = (size - logo.height) // 2
    canvas.alpha_composite(logo, (left, top))
    return canvas


def save_png(
    path: Path,
    *,
    size: int,
    background: tuple[int, int, int, int],
    padding_ratio: float,
    fit: str = "contain",
) -> None:
    image = render_logo_icon(size, background=background, padding_ratio=padding_ratio, fit=fit)
    image.save(path)


def save_ico(path: Path) -> None:
    image = render_logo_icon(256, background=TRANSPARENT, padding_ratio=0.0, fit="cover")
    image.save(
        path,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )


def write_svg(path: Path, master: Path, *, monochrome: bool = False) -> None:
    text = master.read_text(encoding="utf-8")
    if monochrome:
        text = re.sub(r"url\(#tragram-gradient\)", "#000000", text)
        text = re.sub(r"fill=\"#[0-9a-fA-F]{6}\"", 'fill="#000000"', text)
        text = re.sub(r"<defs>.*?</defs>", "", text, flags=re.DOTALL)
    path.write_text(text, encoding="utf-8")


def generate_icon_set(destination: Path, *, include_app_icon: bool) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    save_png(destination / "favicon-16x16.png", size=16, background=TRANSPARENT, padding_ratio=0.0, fit="contain")
    save_png(destination / "favicon-32x32.png", size=32, background=TRANSPARENT, padding_ratio=0.0, fit="contain")
    save_png(destination / "apple-touch-icon.png", size=180, background=MIDNIGHT, padding_ratio=0.18)
    save_png(destination / "icon-192.png", size=192, background=TRANSPARENT, padding_ratio=0.0)
    save_png(destination / "icon-512.png", size=512, background=TRANSPARENT, padding_ratio=0.0)
    save_png(destination / "icon-192-maskable.png", size=192, background=MIDNIGHT, padding_ratio=0.18)
    save_png(destination / "icon-512-maskable.png", size=512, background=MIDNIGHT, padding_ratio=0.18)
    # Keep the existing compatibility PNG used by older templates.
    save_png(destination / "favicon.png", size=64, background=TRANSPARENT, padding_ratio=0.0)
    if include_app_icon:
        save_ico(destination / "favicon.ico")
    if include_app_icon:
        write_svg(destination / "safari-pinned-tab.svg", BRAND_MASTERS / "symbol-navy.svg", monochrome=True)
        write_svg(destination / "icon.svg", BRAND_MASTERS / "symbol-gradient.svg")


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    APP.mkdir(parents=True, exist_ok=True)

    generate_icon_set(PUBLIC, include_app_icon=False)
    # Next's /favicon.ico route is backed by the app-directory file, not public/.
    save_ico(APP / "favicon.ico")
    write_svg(APP / "icon.svg", BRAND_MASTERS / "symbol-gradient.svg")
    write_svg(PUBLIC / "safari-pinned-tab.svg", BRAND_MASTERS / "symbol-navy.svg", monochrome=True)
    generate_icon_set(ADMIN_PUBLIC, include_app_icon=True)


if __name__ == "__main__":
    main()
