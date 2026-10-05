#!/usr/bin/env python3
"""Validate public-page visual parity screenshots and anchors."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

try:
    from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageStat
except ImportError as exc:  # pragma: no cover - environment check
    raise SystemExit(
        "Pillow is required for visual parity validation. "
        "Install with: python3 -m pip install pillow"
    ) from exc


MODES = ("desktop", "mobile")
PAGES = ("home", "about", "features", "pricing", "faqs", "contact", "not_found")

ANCHOR_THRESHOLDS = {
    "desktop": {
        "headerY": 12,
        "heroTitleY": 12,
        "firstSectionY": 20,
    },
    "mobile": {
        "headerY": 14,
        "heroTitleY": 14,
        "firstSectionY": 24,
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate visual parity outputs.")
    parser.add_argument(
        "--output-root",
        default="output/playwright/visual-check",
        help="Visual parity artifact root.",
    )
    parser.add_argument(
        "--fail-on-threshold",
        action="store_true",
        default=True,
        help="Fail when thresholds are exceeded (default: true).",
    )
    return parser.parse_args()


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def image_metrics(local_path: Path, appzen_path: Path) -> dict[str, float]:
    local_image = Image.open(local_path).convert("RGB")
    appzen_image = Image.open(appzen_path).convert("RGB")
    if local_image.size != appzen_image.size:
        appzen_image = appzen_image.resize(local_image.size)

    diff = ImageChops.difference(local_image, appzen_image)
    mean_channels = ImageStat.Stat(diff).mean
    mae_pct = (sum(mean_channels) / (len(mean_channels) * 255.0)) * 100.0

    local_edges = local_image.convert("L").filter(ImageFilter.FIND_EDGES)
    appzen_edges = appzen_image.convert("L").filter(ImageFilter.FIND_EDGES)
    edge_diff = ImageChops.difference(local_edges, appzen_edges)
    edge_delta_pct = (ImageStat.Stat(edge_diff).mean[0] / 255.0) * 100.0

    return {
        "maePct": round(mae_pct, 2),
        "edgeDeltaPct": round(edge_delta_pct, 2),
    }


def side_by_side(local_path: Path, appzen_path: Path, target_path: Path, label: str) -> None:
    local_image = Image.open(local_path).convert("RGB")
    appzen_image = Image.open(appzen_path).convert("RGB")
    if local_image.size != appzen_image.size:
        appzen_image = appzen_image.resize(local_image.size)

    width, height = local_image.size
    canvas = Image.new("RGB", (width * 2, height + 36), color=(8, 14, 28))
    canvas.paste(local_image, (0, 36))
    canvas.paste(appzen_image, (width, 36))
    draw = ImageDraw.Draw(canvas)
    draw.text((12, 12), f"LOCAL {label}", fill=(226, 236, 248))
    draw.text((width + 12, 12), f"APPZEN {label}", fill=(226, 236, 248))
    canvas.save(target_path)


def load_anchor(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def anchor_deltas(local_anchor: dict[str, Any], appzen_anchor: dict[str, Any]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key in ("headerY", "heroTitleY", "firstSectionY"):
        local_value = local_anchor.get("anchors", {}).get(key)
        appzen_value = appzen_anchor.get("anchors", {}).get(key)
        if local_value is None or appzen_value is None:
            result[key] = None
        else:
            result[key] = abs(int(local_value) - int(appzen_value))
    return result


def build_report(output_root: Path) -> tuple[list[dict[str, Any]], list[str]]:
    rows: list[dict[str, Any]] = []
    failures: list[str] = []

    comparison_root = output_root / "comparison"
    ensure_dir(comparison_root / "desktop")
    ensure_dir(comparison_root / "mobile")

    for mode in MODES:
        thresholds = ANCHOR_THRESHOLDS[mode]
        for page in PAGES:
            local_image = output_root / "local" / mode / f"{page}.png"
            appzen_image = output_root / "appzen" / mode / f"{page}.png"
            local_anchor_file = output_root / "anchors" / "local" / mode / f"{page}.json"
            appzen_anchor_file = output_root / "anchors" / "appzen" / mode / f"{page}.json"

            if not all(
                [
                    local_image.exists(),
                    appzen_image.exists(),
                    local_anchor_file.exists(),
                    appzen_anchor_file.exists(),
                ]
            ):
                failures.append(f"[{mode}/{page}] missing screenshot or anchor artifact")
                continue

            metrics = image_metrics(local_image, appzen_image)
            local_anchor = load_anchor(local_anchor_file)
            appzen_anchor = load_anchor(appzen_anchor_file)
            deltas = anchor_deltas(local_anchor, appzen_anchor)

            anchor_pass = True
            for key, threshold in thresholds.items():
                delta = deltas.get(key)
                if delta is None or delta > threshold:
                    anchor_pass = False
                    failures.append(
                        f"[{mode}/{page}] anchor {key} delta {delta} exceeded threshold {threshold}"
                    )

            rows.append(
                {
                    "mode": mode,
                    "page": page,
                    "maePct": metrics["maePct"],
                    "edgeDeltaPct": metrics["edgeDeltaPct"],
                    "anchors": deltas,
                    "anchorPass": anchor_pass,
                    "localUrl": local_anchor.get("href"),
                    "appzenUrl": appzen_anchor.get("href"),
                }
            )

            side_by_side(
                local_image,
                appzen_image,
                comparison_root / mode / f"{page}-side-by-side.png",
                f"{mode} {page}",
            )

    return rows, failures


def build_overview_sheet(output_root: Path) -> None:
    comparison_root = output_root / "comparison"
    for mode in MODES:
        images = []
        for page in PAGES:
            image_path = comparison_root / mode / f"{page}-side-by-side.png"
            if image_path.exists():
                images.append((page, Image.open(image_path).convert("RGB")))
        if not images:
            continue

        max_width = max(image.width for _, image in images)
        max_height = max(image.height for _, image in images)
        cols = 2
        rows = (len(images) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * max_width, rows * max_height), color=(6, 12, 24))
        draw = ImageDraw.Draw(sheet)

        for index, (page, image) in enumerate(images):
            x = (index % cols) * max_width
            y = (index // cols) * max_height
            sheet.paste(image, (x, y))
            draw.text((x + 12, y + 14), page, fill=(255, 231, 92))

        sheet.save(comparison_root / mode / "ALL-side-by-side.png")


def write_reports(output_root: Path, rows: list[dict[str, Any]], failures: list[str]) -> None:
    (output_root / "report.json").write_text(json.dumps(rows, indent=2), encoding="utf-8")

    lines = ["# Visual Parity Report", ""]
    for mode in MODES:
        lines.append(f"## {mode.capitalize()}")
        lines.append("| Page | MAE % | Edge % | Header Δpx | Hero Δpx | First Δpx | Anchor Pass |")
        lines.append("|---|---:|---:|---:|---:|---:|:---:|")
        mode_rows = [row for row in rows if row["mode"] == mode]
        for row in mode_rows:
            anchors = row["anchors"]
            lines.append(
                f"| {row['page']} | {row['maePct']:.2f} | {row['edgeDeltaPct']:.2f} | "
                f"{anchors.get('headerY')} | {anchors.get('heroTitleY')} | {anchors.get('firstSectionY')} | "
                f"{'PASS' if row['anchorPass'] else 'FAIL'} |"
            )
        lines.append("")

    if failures:
        lines.append("## Failures")
        for failure in failures:
            lines.append(f"- {failure}")
    else:
        lines.append("## Failures")
        lines.append("- none")

    lines.append("")
    lines.append("## Thresholds")
    lines.append("- Desktop: header ±12px, hero ±12px, first section ±20px")
    lines.append("- Mobile: header ±14px, hero ±14px, first section ±24px")
    lines.append("")
    lines.append(f"Generated under `{output_root}`")

    (output_root / "report.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    args = parse_args()
    output_root = Path(args.output_root)
    ensure_dir(output_root)

    rows, failures = build_report(output_root)
    build_overview_sheet(output_root)
    write_reports(output_root, rows, failures)

    print(f"Wrote report to {output_root / 'report.md'}")
    if failures and args.fail_on_threshold:
        print("Visual parity validation failed.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
