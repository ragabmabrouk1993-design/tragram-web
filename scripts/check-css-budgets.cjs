#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const webappRoot = path.resolve(__dirname, "..");
const nextRoot = path.join(webappRoot, ".next");

const DEFAULT_MAX_ENTRY_CSS_KB = Number(process.env.CSS_BUDGET_KB || 180);
const STRICT_MODE = process.env.CSS_BUDGET_STRICT !== "0";

function walkFiles(dirPath, fileFilter) {
  const out = [];
  if (!fs.existsSync(dirPath)) return out;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(fullPath, fileFilter));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!fileFilter(fullPath)) continue;
    out.push(fullPath);
  }
  return out;
}

function parseManifestObject(fileText) {
  const marker = 'globalThis.__RSC_MANIFEST["';
  const markerIndex = fileText.indexOf(marker);
  if (markerIndex === -1) return null;
  const assignIndex = fileText.indexOf(" = ", markerIndex);
  if (assignIndex === -1) return null;
  const objectStart = fileText.indexOf("{", assignIndex);
  if (objectStart === -1) return null;

  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let objectEnd = -1;

  for (let i = objectStart; i < fileText.length; i += 1) {
    const ch = fileText[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (ch === "\\") {
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        objectEnd = i;
        break;
      }
    }
  }

  if (objectEnd === -1) return null;
  const jsonText = fileText.slice(objectStart, objectEnd + 1);
  return JSON.parse(jsonText);
}

function bytesToKb(bytes) {
  return bytes / 1024;
}

function getCssBytesFromEntryFiles(entryCssFiles) {
  let totalBytes = 0;
  for (const item of entryCssFiles) {
    const rel = typeof item === "string" ? item : item.path;
    const absPath = path.join(nextRoot, rel);
    if (!fs.existsSync(absPath)) continue;
    totalBytes += fs.statSync(absPath).size;
  }
  return totalBytes;
}

function getEntryBudgetKb(entryKey) {
  if (entryKey.includes("/not-found")) return 620;
  if (entryKey.includes("/[lang]/marketing/")) return 560;
  if (entryKey.includes("/[lang]/(public)/")) return 620;
  if (entryKey.includes("/[lang]/dashboard/")) return 220;
  if (entryKey.includes("/[lang]/channels/")) return 220;
  if (entryKey.includes("/[lang]/reports/")) return 220;
  if (entryKey.includes("/[lang]/profile/")) return 220;
  if (entryKey.includes("/[lang]/auth/")) return 160;
  return DEFAULT_MAX_ENTRY_CSS_KB;
}

function main() {
  if (!fs.existsSync(nextRoot)) {
    console.error("Missing .next directory. Run build before CSS budget checks.");
    process.exit(1);
  }

  const manifestFiles = walkFiles(
    path.join(nextRoot, "server", "app"),
    (filePath) => filePath.endsWith("page_client-reference-manifest.js")
  );

  if (manifestFiles.length === 0) {
    console.error("No page_client-reference-manifest.js files found under .next/server/app.");
    process.exit(1);
  }

  const entries = [];
  for (const manifestPath of manifestFiles) {
    const text = fs.readFileSync(manifestPath, "utf8");
    const manifest = parseManifestObject(text);
    if (!manifest || !manifest.entryCSSFiles) continue;

    for (const [entryKey, entryCssFiles] of Object.entries(manifest.entryCSSFiles)) {
      const bytes = getCssBytesFromEntryFiles(entryCssFiles);
      const budgetKb = getEntryBudgetKb(entryKey);
      entries.push({
        entryKey,
        bytes,
        kb: bytesToKb(bytes),
        budgetKb,
        overBudget: bytesToKb(bytes) > budgetKb,
      });
    }
  }

  if (entries.length === 0) {
    console.error("No entryCSSFiles found in route manifests.");
    process.exit(1);
  }

  // Keep the biggest unique entries only.
  const byKey = new Map();
  for (const entry of entries) {
    const existing = byKey.get(entry.entryKey);
    if (!existing || entry.bytes > existing.bytes) {
      byKey.set(entry.entryKey, entry);
    }
  }
  const uniqueEntries = [...byKey.values()].sort((a, b) => b.bytes - a.bytes);

  console.log("CSS entry budgets:");
  for (const entry of uniqueEntries.slice(0, 30)) {
    const status = entry.overBudget ? "OVER" : "OK";
    console.log(
      `${status.padEnd(4)} ${entry.kb.toFixed(1).padStart(7)} KB / ${entry.budgetKb
        .toFixed(1)
        .padStart(7)} KB :: ${entry.entryKey}`
    );
  }

  const offenders = uniqueEntries.filter((entry) => entry.overBudget);
  if (offenders.length > 0) {
    console.error(`\n${offenders.length} CSS entry budget violations detected.`);
    if (STRICT_MODE) {
      process.exit(1);
    }
  }

  process.exit(0);
}

main();
