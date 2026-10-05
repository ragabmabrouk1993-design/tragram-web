#!/usr/bin/env python3
"""Check auth-page CSS parity between client navigation and hard load."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path
from shutil import which
from typing import Any
from urllib.error import URLError
from urllib.request import urlopen


SCENARIOS = [
    {
        "id": "home_to_login",
        "entry_path": "/en",
        "target_path": "/en/auth/login",
        "target_suffix": "/auth/login",
        "text_tokens": ["login", "sign in"],
    },
    {
        "id": "home_to_signup",
        "entry_path": "/en",
        "target_path": "/en/auth/signup",
        "target_suffix": "/auth/signup",
        "text_tokens": ["get started", "sign up", "signup"],
    },
    {
        "id": "features_to_login",
        "entry_path": "/en/features",
        "target_path": "/en/auth/login",
        "target_suffix": "/auth/login",
        "text_tokens": ["login", "sign in"],
    },
    {
        "id": "features_to_signup",
        "entry_path": "/en/features",
        "target_path": "/en/auth/signup",
        "target_suffix": "/auth/signup",
        "text_tokens": ["get started", "sign up", "signup"],
    },
]

SELECTOR_PROPERTIES = {
    "#auth-route-root h1": ["fontSize", "lineHeight", "fontWeight", "marginTop", "marginBottom"],
    "#auth-route-root h2": ["fontSize", "lineHeight", "fontWeight", "marginTop", "marginBottom"],
    "#auth-route-root p": ["fontSize", "lineHeight", "color", "marginTop", "marginBottom"],
    "#auth-route-root input": [
        "fontSize",
        "lineHeight",
        "color",
        "borderTopColor",
        "borderRightColor",
        "borderBottomColor",
        "borderLeftColor",
        "height",
    ],
    "#auth-route-root .auth-round": [
        "borderRadius",
        "borderTopColor",
        "borderRightColor",
        "borderBottomColor",
        "borderLeftColor",
    ],
    "#auth-route-root .login-panel": [
        "backgroundColor",
        "borderTopColor",
        "borderRightColor",
        "borderBottomColor",
        "borderLeftColor",
        "borderRadius",
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
    ],
    "#auth-route-root .btn-default": [
        "fontSize",
        "lineHeight",
        "borderRadius",
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
        "backgroundColor",
        "color",
    ],
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Assert auth route styles are identical for client navigation and hard loads."
    )
    parser.add_argument(
        "--pwcli",
        default=os.environ.get(
            "PWCLI", os.path.expanduser("~/.codex/skills/playwright/scripts/playwright_cli.sh")
        ),
        help="Path to playwright CLI wrapper.",
    )
    parser.add_argument(
        "--base-url",
        default=os.environ.get("AUTH_CSS_PARITY_BASE_URL", "http://localhost:3102"),
        help="Base URL of the running web app (without trailing slash).",
    )
    parser.add_argument(
        "--report",
        default="../../output/playwright/auth-css-parity/report.json",
        help="Output JSON report path.",
    )
    parser.add_argument(
        "--wait-seconds",
        type=float,
        default=0.9,
        help="Wait after each navigation/click.",
    )
    parser.add_argument(
        "--timeout-seconds",
        type=float,
        default=12.0,
        help="Max wait for route transition after client click.",
    )
    return parser.parse_args()


def parse_eval_result(output: str) -> Any:
    match = re.search(r"### Result\n(.*?)\n### Ran", output, flags=re.DOTALL)
    if not match:
        raise RuntimeError(f"Could not parse playwright eval output:\n{output[:1000]}")
    return json.loads(match.group(1))


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
        raise RuntimeError(f"Playwright command failed: {args}\n{output[:1200]}")
    return output


def eval_json(pwcli: str, session: str, script: str) -> Any:
    output = run_pwcli(pwcli, session, "eval", script)
    return parse_eval_result(output)


def build_click_eval_script(target_path: str, target_suffix: str, text_tokens: list[str]) -> str:
    payload = {
        "targetPath": target_path,
        "targetSuffix": target_suffix,
        "textTokens": text_tokens,
    }
    payload_json = json.dumps(payload)
    return (
        "() => {"
        f"const cfg = {payload_json};"
        "const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim().toLowerCase();"
        "const isVisible = (el) => {"
        "  if (!el) return false;"
        "  const style = window.getComputedStyle(el);"
        "  if (style.display === 'none' || style.visibility === 'hidden') return false;"
        "  if (style.opacity === '0') return false;"
        "  return el.getClientRects().length > 0;"
        "};"
        "const clickElement = (el, reason) => {"
        "  el.scrollIntoView({ block: 'center', inline: 'nearest' });"
        "  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));"
        "  return {"
        "    clicked: true,"
        "    reason,"
        "    tag: el.tagName.toLowerCase(),"
        "    text: normalize(el.textContent || ''),"
        "    href: (el.getAttribute('href') || el.href || null),"
        "    pathnameBefore: location.pathname"
        "  };"
        "};"
        "const links = Array.from(document.querySelectorAll('a[href]')).filter(isVisible);"
        "for (const link of links) {"
        "  const hrefAttr = link.getAttribute('href') || '';"
        "  const hrefAbs = link.href || '';"
        "  if (hrefAttr.includes(cfg.targetPath) || hrefAttr.includes(cfg.targetSuffix) || hrefAbs.includes(cfg.targetPath) || hrefAbs.includes(cfg.targetSuffix)) {"
        "    return clickElement(link, 'href-match');"
        "  }"
        "}"
        "const controls = Array.from(document.querySelectorAll('a,button,[role=\"button\"]')).filter(isVisible);"
        "for (const control of controls) {"
        "  const text = normalize(control.textContent || control.getAttribute('aria-label') || '');"
        "  if (!text) continue;"
        "  if (cfg.textTokens.some((token) => text.includes(token))) {"
        "    return clickElement(control, 'text-match');"
        "  }"
        "}"
        "return {"
        "  clicked: false,"
        "  reason: 'target-control-not-found',"
        "  pathnameBefore: location.pathname,"
        "  visibleLinks: links.slice(0, 20).map((link) => ({"
        "    text: normalize(link.textContent || ''),"
        "    href: link.getAttribute('href') || link.href || null"
        "  }))"
        "};"
        "}"
    )


def build_style_eval_script() -> str:
    payload_json = json.dumps(SELECTOR_PROPERTIES)
    return (
        "() => {"
        f"const selectorProps = {payload_json};"
        "const snapshot = {};"
        "for (const [selector, props] of Object.entries(selectorProps)) {"
        "  const node = document.querySelector(selector);"
        "  if (!node) {"
        "    snapshot[selector] = { found: false };"
        "    continue;"
        "  }"
        "  const style = window.getComputedStyle(node);"
        "  const picked = {};"
        "  for (const prop of props) picked[prop] = style[prop];"
        "  snapshot[selector] = {"
        "    found: true,"
        "    tag: node.tagName.toLowerCase(),"
        "    className: node.className || '',"
        "    style: picked"
        "  };"
        "}"
        "return {"
        "  href: location.href,"
        "  pathname: location.pathname,"
        "  hasAuthRoot: Boolean(document.querySelector('#auth-route-root')),"
        "  snapshot"
        "};"
        "}"
    )


def normalize_value(value: Any) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value).strip())


def values_equal(left: str, right: str) -> bool:
    px_match_left = re.fullmatch(r"(-?\d+(?:\.\d+)?)px", left)
    px_match_right = re.fullmatch(r"(-?\d+(?:\.\d+)?)px", right)
    if px_match_left and px_match_right:
        return abs(float(px_match_left.group(1)) - float(px_match_right.group(1))) <= 0.05
    return left == right


def wait_for_route_suffix(
    pwcli: str,
    session: str,
    target_suffix: str,
    timeout_seconds: float,
) -> tuple[bool, str]:
    deadline = time.time() + timeout_seconds
    last_pathname = ""
    while time.time() < deadline:
        current_pathname = eval_json(pwcli, session, "() => location.pathname")
        last_pathname = str(current_pathname or "")
        if last_pathname.endswith(target_suffix):
            return True, last_pathname
        time.sleep(0.25)
    return False, last_pathname


def compare_snapshots(nav_snapshot: dict[str, Any], direct_snapshot: dict[str, Any]) -> list[dict[str, str]]:
    mismatches: list[dict[str, str]] = []
    for selector, properties in SELECTOR_PROPERTIES.items():
        nav_entry = nav_snapshot.get("snapshot", {}).get(selector, {})
        direct_entry = direct_snapshot.get("snapshot", {}).get(selector, {})

        if not nav_entry.get("found") and not direct_entry.get("found"):
            continue

        if not nav_entry.get("found"):
            mismatches.append(
                {
                    "selector": selector,
                    "property": "found",
                    "navigation": "missing",
                    "direct": "present" if direct_entry.get("found") else "missing",
                }
            )
            continue

        if not direct_entry.get("found"):
            mismatches.append(
                {
                    "selector": selector,
                    "property": "found",
                    "navigation": "present",
                    "direct": "missing",
                }
            )
            continue

        for prop in properties:
            nav_value = normalize_value(nav_entry.get("style", {}).get(prop))
            direct_value = normalize_value(direct_entry.get("style", {}).get(prop))
            if not values_equal(nav_value, direct_value):
                mismatches.append(
                    {
                        "selector": selector,
                        "property": prop,
                        "navigation": nav_value,
                        "direct": direct_value,
                    }
                )

    return mismatches


def ensure_pwcli_available(pwcli: str) -> None:
    looks_like_path = "/" in pwcli or pwcli.startswith(".")
    if looks_like_path and not Path(pwcli).exists():
        raise RuntimeError(
            f"PWCLI not found at '{pwcli}'. Set --pwcli or PWCLI to a valid playwright-cli wrapper path."
        )
    if not looks_like_path and which(pwcli) is None:
        raise RuntimeError(
            f"PWCLI command '{pwcli}' not found in PATH. Set --pwcli or PWCLI accordingly."
        )


def ensure_base_url_reachable(base_url: str) -> None:
    probe_url = f"{base_url}/en"
    try:
        with urlopen(probe_url, timeout=4):
            return
    except URLError as exc:
        raise RuntimeError(
            f"Web app is not reachable at '{probe_url}'. Start the app server and retry."
        ) from exc


def run_scenario(
    pwcli: str,
    session: str,
    base_url: str,
    wait_seconds: float,
    timeout_seconds: float,
    scenario: dict[str, Any],
) -> dict[str, Any]:
    entry_url = f"{base_url}{scenario['entry_path']}"
    target_url = f"{base_url}{scenario['target_path']}"
    click_script = build_click_eval_script(
        target_path=scenario["target_path"],
        target_suffix=scenario["target_suffix"],
        text_tokens=scenario["text_tokens"],
    )
    style_script = build_style_eval_script()

    run_pwcli(pwcli, session, "goto", entry_url)
    time.sleep(wait_seconds)

    click_result = eval_json(pwcli, session, click_script)
    transition_ok, transition_path = wait_for_route_suffix(
        pwcli=pwcli,
        session=session,
        target_suffix=scenario["target_suffix"],
        timeout_seconds=timeout_seconds,
    )
    time.sleep(wait_seconds)

    nav_styles = eval_json(pwcli, session, style_script)

    run_pwcli(pwcli, session, "goto", target_url)
    run_pwcli(pwcli, session, "reload")
    time.sleep(wait_seconds)
    direct_styles = eval_json(pwcli, session, style_script)

    mismatches = compare_snapshots(nav_styles, direct_styles)
    status = "passed"
    if not click_result.get("clicked"):
        status = "failed"
    if not transition_ok:
        status = "failed"
    if not nav_styles.get("hasAuthRoot") or not direct_styles.get("hasAuthRoot"):
        status = "failed"
    if mismatches:
        status = "failed"

    return {
        "scenario": scenario["id"],
        "entryUrl": entry_url,
        "targetUrl": target_url,
        "clickResult": click_result,
        "transition": {
            "ok": transition_ok,
            "pathAfterClick": transition_path,
        },
        "navigationSnapshot": nav_styles,
        "directSnapshot": direct_styles,
        "mismatches": mismatches,
        "status": status,
    }


def main() -> int:
    args = parse_args()
    pwcli = args.pwcli
    base_url = args.base_url.rstrip("/")
    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    session = f"auth_css_parity_{int(time.time())}"

    try:
        ensure_pwcli_available(pwcli)
        ensure_base_url_reachable(base_url)
        run_pwcli(pwcli, session, "open", f"{base_url}/en")
        run_pwcli(pwcli, session, "resize", "1365", "768")

        scenario_results = []
        for scenario in SCENARIOS:
            result = run_scenario(
                pwcli=pwcli,
                session=session,
                base_url=base_url,
                wait_seconds=args.wait_seconds,
                timeout_seconds=args.timeout_seconds,
                scenario=scenario,
            )
            scenario_results.append(result)
            mismatch_count = len(result["mismatches"])
            print(
                f"[auth-css-parity] {result['scenario']}: {result['status']} "
                f"(mismatches={mismatch_count}, transition_ok={result['transition']['ok']})"
            )

        failed = [result for result in scenario_results if result["status"] != "passed"]
        report = {
            "timestamp": int(time.time()),
            "baseUrl": base_url,
            "waitSeconds": args.wait_seconds,
            "timeoutSeconds": args.timeout_seconds,
            "pwcli": pwcli,
            "session": session,
            "results": scenario_results,
            "summary": {
                "total": len(scenario_results),
                "failed": len(failed),
                "passed": len(scenario_results) - len(failed),
            },
        }
        report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"[auth-css-parity] report: {report_path}")

        if failed:
            print("[auth-css-parity] parity check failed", file=sys.stderr)
            return 1
        print("[auth-css-parity] parity check passed")
        return 0
    except Exception as exc:  # pylint: disable=broad-except
        print(f"[auth-css-parity] failed: {exc}", file=sys.stderr)
        return 1
    finally:
        try:
            run_pwcli(pwcli, session, "close")
        except Exception:
            pass


if __name__ == "__main__":
    raise SystemExit(main())
