#!/usr/bin/env python3
"""Capture the current public experience without enabling billing or Appzen parity."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import shutil

spec = importlib.util.spec_from_file_location('capture_helpers', Path(__file__).with_name('visual-parity-capture.py'))
helpers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helpers)

parser = argparse.ArgumentParser()
parser.add_argument('--local-base', default='http://localhost:3002')
parser.add_argument('--locales', nargs='+', default=['en', 'ar'])
parser.add_argument('--widths', nargs='+', type=int, default=[320,390,768,1440])
parser.add_argument('--output-root', default='output/playwright/public-content-refresh')
parser.add_argument('--pwcli', default=os.path.expanduser('~/.codex/skills/playwright/scripts/playwright_cli.sh'))
parser.add_argument('--session', default='tragram-public-refresh')
args = parser.parse_args()
routes = ['', '/features', '/about', '/faqs', '/help-center', '/contact', '/privacy-policy', '/account-deletion', '/telegram-signal-copier', '/blog/copy-telegram-signals-from-phone']
results = []
session = args.session
root = Path(args.output_root)
root.mkdir(parents=True, exist_ok=True)
try:
    helpers.run_pwcli(args.pwcli, session, 'open', args.local_base + '/en')
    for locale in args.locales:
        for width in args.widths:
            helpers.run_pwcli(args.pwcli, session, 'resize', str(width), '932')
            for route in routes:
                url = args.local_base.rstrip('/') + '/' + locale + route
                helpers.run_pwcli(args.pwcli, session, 'goto', url)
                helpers.run_pwcli(args.pwcli, session, 'snapshot')
                metrics = helpers.parse_eval_result(helpers.run_pwcli(args.pwcli, session, 'eval', '() => ({url:location.href,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,h1s:document.querySelectorAll("h1").length,mains:document.querySelectorAll("main").length})'))
                results.append(metrics)
                helpers.run_pwcli(args.pwcli, session, 'screenshot')
                name = (route.strip('/').replace('/','-') or 'home') + '.png'
                target = root / locale / str(width) / name
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(helpers.latest_cli_screenshot(), target)
finally:
    helpers.run_pwcli(args.pwcli, session, 'close')
    (root / 'metrics.json').write_text(json.dumps(results, indent=2), encoding='utf8')
if any(row['scrollWidth'] > row['width'] or row['h1s'] != 1 or row['mains'] != 1 for row in results):
    raise SystemExit('Public layout contract failed; inspect metrics.json')
