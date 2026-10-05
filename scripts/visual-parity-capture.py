#!/usr/bin/env python3
"""Capture local-vs-Appzen visual parity screenshots and anchor metadata."""

from __future__ import annotations

import argparse
import glob
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from shutil import which
from typing import Any


VIEWPORTS = {
    "desktop": (1365, 768),
    "mobile": (430, 932),
}

ROUTES = [
    {
        "id": "home",
        "local_path": "/",
        "appzen_url": "https://html.awaikenthemes.com/appzen/index-2.html",
        "hero_title_selectors": [
            ".hero-content-elite h1",
            ".hero-content h1",
            ".page-header-box h1",
        ],
        "first_section_selectors": [
            ".hero-image-box-elite",
            ".hero-circle-progress-box-elite",
            ".about-us",
        ],
    },
    {
        "id": "about",
        "local_path": "/about",
        "appzen_url": "https://html.awaikenthemes.com/appzen/about.html",
        "hero_title_selectors": [".page-header-box h1"],
        "first_section_selectors": [".about-us"],
    },
    {
        "id": "features",
        "local_path": "/features",
        "appzen_url": "https://html.awaikenthemes.com/appzen/features.html",
        "hero_title_selectors": [".page-header-box h1"],
        "first_section_selectors": [".page-features"],
    },
    {
        "id": "pricing",
        "local_path": "/pricing",
        "appzen_url": "https://html.awaikenthemes.com/appzen/pricing.html",
        "hero_title_selectors": [".page-header-box h1"],
        "first_section_selectors": [".page-pricing"],
    },
    {
        "id": "faqs",
        "local_path": "/faqs",
        "appzen_url": "https://html.awaikenthemes.com/appzen/faqs.html",
        "hero_title_selectors": [".page-header-box h1"],
        "first_section_selectors": [".page-faqs"],
    },
    {
        "id": "contact",
        "local_path": "/contact",
        "appzen_url": "https://html.awaikenthemes.com/appzen/contact.html",
        "hero_title_selectors": [".page-header-box h1"],
        "first_section_selectors": [".contact-info-list", ".page-contact-us"],
    },
    {
        "id": "not_found",
        "local_path": "__404__",
        "appzen_url": "https://html.awaikenthemes.com/appzen/404.html",
        "hero_title_selectors": [".page-header-box h1", ".error-page-content h2"],
        "first_section_selectors": [".error-page"],
    },
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Capture public-page visual parity screenshots.")
    parser.add_argument(
        "--pwcli",
        default=os.environ.get(
            "PWCLI", os.path.expanduser("~/.codex/skills/playwright/scripts/playwright_cli.sh")
        ),
        help="Path to playwright CLI wrapper.",
    )
    parser.add_argument(
        "--local-base",
        default=os.environ.get("VISUAL_PARITY_LOCAL_BASE", "http://localhost:3002/en"),
        help="Local EN base URL.",
    )
    parser.add_argument(
        "--output-root",
        default="output/playwright/visual-check",
        help="Capture artifact root.",
    )
    parser.add_argument(
        "--wait-seconds",
        type=float,
        default=1.0,
        help="Wait time after each navigation before screenshot/eval.",
    )
    return parser.parse_args()


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def run_pwcli(pwcli: str, session: str, *args: str) -> str:
    env = os.environ.copy()
    env["PLAYWRIGHT_CLI_SESSION"] = session
    result = subprocess.run(
        [pwcli, *args],
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    output = (result.stdout or "") + (result.stderr or "")
    if result.returncode != 0:
        raise RuntimeError(
            f"Playwright CLI failed (session={session}, args={args}):\n{output[:1000]}"
        )
    return output


def latest_cli_screenshot() -> Path:
    candidates = sorted(
        glob.glob(".playwright-cli/*.png"),
        key=lambda p: os.path.getmtime(p),
        reverse=True,
    )
    if not candidates:
        raise RuntimeError("No screenshot found under .playwright-cli/")
    return Path(candidates[0])


def parse_eval_result(output: str) -> Any:
    match = re.search(r"### Result\n(.*?)\n### Ran", output, flags=re.DOTALL)
    if not match:
        raise RuntimeError(f"Could not parse eval result:\n{output[:1000]}")
    return json.loads(match.group(1))


def route_url(site: str, local_base: str, route: dict[str, Any]) -> str:
    if site == "appzen":
        return route["appzen_url"]

    if route["local_path"] == "__404__":
        return f"{local_base}/this-route-should-404"

    return f"{local_base}{route['local_path']}"


def build_anchor_eval_script(route: dict[str, Any]) -> str:
    payload = {
        "header": ["header.main-header .header-sticky", "header.main-header", ".header-sticky"],
        "hero_title": route["hero_title_selectors"],
        "first_section": route["first_section_selectors"],
    }
    payload_json = json.dumps(payload)
    return (
        "() => {"
        f"const cfg = {payload_json};"
        "const pick = (selectors) => {"
        "  for (const selector of selectors) {"
        "    const node = document.querySelector(selector);"
        "    if (node) {"
        "      return { selector, y: Math.round(node.getBoundingClientRect().top) };"
        "    }"
        "  }"
        "  return { selector: null, y: null };"
        "};"
        "const header = pick(cfg.header);"
        "const hero = pick(cfg.hero_title);"
        "const first = pick(cfg.first_section);"
        "return {"
        "  href: location.href,"
        "  anchors: {"
        "    headerY: header.y,"
        "    heroTitleY: hero.y,"
        "    firstSectionY: first.y"
        "  },"
        "  selectors: {"
        "    header: header.selector,"
        "    heroTitle: hero.selector,"
        "    firstSection: first.selector"
        "  }"
        "};"
        "}"
    )


def capture_matrix(
    pwcli: str,
    output_root: Path,
    local_base: str,
    wait_seconds: float,
) -> None:
    for site in ("local", "appzen"):
        for mode, (width, height) in VIEWPORTS.items():
            session = f"vp_{site}_{mode}"
            site_output = output_root / site / mode
            anchors_output = output_root / "anchors" / site / mode
            ensure_dir(site_output)
            ensure_dir(anchors_output)

            open_url = local_base if site == "local" else ROUTES[0]["appzen_url"]
            run_pwcli(pwcli, session, "open", open_url)
            run_pwcli(pwcli, session, "resize", str(width), str(height))

            if site == "local":
                parity_mode_output = run_pwcli(
                    pwcli,
                    session,
                    "eval",
                    "() => {"
                    "  const meta = document.querySelector('meta[name=\"tragram-visual-parity-mode\"]');"
                    "  const value = (meta?.getAttribute('content') || '').trim().toLowerCase();"
                    "  return ['1','true','yes','on'].includes(value);"
                    "}",
                )
                parity_mode_enabled = bool(parse_eval_result(parity_mode_output))
                if not parity_mode_enabled:
                    raise RuntimeError(
                        "NEXT_PUBLIC_VISUAL_PARITY_MODE is disabled in the running webapp. "
                        "Start local webapp with NEXT_PUBLIC_VISUAL_PARITY_MODE=true before capture."
                    )

            for route in ROUTES:
                page_id = route["id"]
                url = route_url(site, local_base, route)
                run_pwcli(pwcli, session, "goto", url)
                time.sleep(wait_seconds)

                run_pwcli(pwcli, session, "screenshot")
                screenshot_src = latest_cli_screenshot()
                screenshot_target = site_output / f"{page_id}.png"
                shutil.copy2(screenshot_src, screenshot_target)

                eval_script = build_anchor_eval_script(route)
                eval_output = run_pwcli(pwcli, session, "eval", eval_script)
                anchor_data = parse_eval_result(eval_output)
                anchor_data.update(
                    {
                        "site": site,
                        "mode": mode,
                        "page": page_id,
                        "expectedUrl": url,
                    }
                )
                (anchors_output / f"{page_id}.json").write_text(
                    json.dumps(anchor_data, indent=2),
                    encoding="utf-8",
                )
                print(f"[capture] {site}/{mode}/{page_id} -> {screenshot_target}")

            run_pwcli(pwcli, session, "close")


def write_manifest(output_root: Path, local_base: str, wait_seconds: float, pwcli: str) -> None:
    manifest = {
        "routes": [route["id"] for route in ROUTES],
        "viewports": {
            mode: {"width": width, "height": height}
            for mode, (width, height) in VIEWPORTS.items()
        },
        "localBase": local_base,
        "appzenReference": "https://html.awaikenthemes.com/appzen/index-2.html",
        "waitSeconds": wait_seconds,
        "pwcli": pwcli,
    }
    (output_root / "capture-manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )


def main() -> int:
    args = parse_args()
    output_root = Path(args.output_root)
    ensure_dir(output_root)

    pwcli_candidate = args.pwcli
    looks_like_path = "/" in pwcli_candidate or pwcli_candidate.startswith(".")
    if looks_like_path and not Path(pwcli_candidate).exists():
        print(
            f"PWCLI not found at '{pwcli_candidate}'. Set --pwcli or PWCLI environment variable.",
            file=sys.stderr,
        )
        return 2
    if not looks_like_path and which(pwcli_candidate) is None:
        print(
            f"PWCLI command '{pwcli_candidate}' not found in PATH.",
            file=sys.stderr,
        )
        return 2

    try:
        capture_matrix(
            pwcli=pwcli_candidate,
            output_root=output_root,
            local_base=args.local_base.rstrip("/"),
            wait_seconds=args.wait_seconds,
        )
        write_manifest(output_root, args.local_base.rstrip("/"), args.wait_seconds, pwcli_candidate)
    except Exception as exc:  # pylint: disable=broad-except
        print(f"visual parity capture failed: {exc}", file=sys.stderr)
        return 1

    print(f"Capture complete under: {output_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
