#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const webappRoot = path.resolve(__dirname, "..");
const nextRoot = path.join(webappRoot, ".next");
const manifestPath = path.join(
  nextRoot,
  "server",
  "app",
  "[lang]",
  "dashboard",
  "page_client-reference-manifest.js"
);

const fail = (message) => {
  console.error(`Symbol badge CSS coverage check failed: ${message}`);
  process.exit(1);
};

if (!fs.existsSync(manifestPath)) {
  fail(`missing manifest file at ${manifestPath}. Run "npm run build --workspace=packages/webapp" first.`);
}

globalThis.__RSC_MANIFEST = {};
require(manifestPath);

const manifestKey = "/[lang]/dashboard/page";
const manifest = globalThis.__RSC_MANIFEST?.[manifestKey];

if (!manifest || typeof manifest !== "object") {
  fail(`could not resolve RSC manifest entry "${manifestKey}".`);
}

const entryCssFiles = manifest.entryCSSFiles;
if (!entryCssFiles || typeof entryCssFiles !== "object") {
  fail("manifest entryCSSFiles is missing.");
}

const dashboardEntryKeys = [
  "[project]/packages/webapp/src/app/[lang]/dashboard/layout",
  "[project]/packages/webapp/src/app/[lang]/dashboard/page",
];

const cssChunkPaths = Array.from(
  new Set(
    dashboardEntryKeys.flatMap((entryKey) =>
      (entryCssFiles[entryKey] ?? []).map((entry) => entry.path)
    )
  )
).filter(Boolean);

if (cssChunkPaths.length === 0) {
  fail("no dashboard CSS chunks were declared in entryCSSFiles.");
}

let combinedCss = "";
for (const relativeChunkPath of cssChunkPaths) {
  const absoluteChunkPath = path.join(nextRoot, relativeChunkPath);
  if (!fs.existsSync(absoluteChunkPath)) {
    fail(`missing CSS chunk file "${relativeChunkPath}".`);
  }
  combinedCss += fs.readFileSync(absoluteChunkPath, "utf8");
}

const markerPresent = /--symbol-pair-badge-ready:\s*1\b/.test(combinedCss);
const overlapPresent =
  /68\.75%/.test(combinedCss) && /translate\(-50%,-50%\)/.test(combinedCss);

if (!markerPresent || !overlapPresent) {
  fail(
    `dashboard entry CSS chunks do not contain SymbolPairBadge module styles. Chunks checked: ${cssChunkPaths.join(
      ", "
    )}`
  );
}

console.log(
  `Symbol badge CSS coverage check passed for dashboard chunks: ${cssChunkPaths.join(", ")}`
);
