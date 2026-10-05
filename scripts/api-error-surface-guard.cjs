#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const webappRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(webappRoot, "src");
const allowMarker = "api-error-guard:allow-raw-message";

const ignoredRelativePaths = new Set([
  "src/lib/error-utils.ts",
]);

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function relFromWebapp(filePath) {
  return toPosixPath(path.relative(webappRoot, filePath));
}

function walkFiles(dirPath) {
  const out = [];
  if (!fs.existsSync(dirPath)) return out;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(fullPath));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    if (/\.test\.(ts|tsx)$/.test(entry.name)) continue;
    out.push(fullPath);
  }
  return out;
}

function isIgnoredFile(absPath) {
  const relPath = relFromWebapp(absPath);
  if (ignoredRelativePaths.has(relPath)) {
    return true;
  }
  return relPath.startsWith("src/lib/api-client/");
}

function main() {
  const files = walkFiles(srcRoot).filter((filePath) => !isIgnoredFile(filePath));
  const issues = [];
  const pattern = /\b([A-Za-z_$][\w$]*)\s+instanceof\s+Error\s*\?\s*\1\.message\s*:/;

  for (const filePath of files) {
    const text = fs.readFileSync(filePath, "utf8");
    const lines = text.split(/\r?\n/);
    const relPath = relFromWebapp(filePath);

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!pattern.test(line)) continue;
      const prevLine = index > 0 ? lines[index - 1] : "";
      if (line.includes(allowMarker) || prevLine.includes(allowMarker)) {
        continue;
      }

      issues.push(
        `${relPath}:${index + 1} raw Error.message fallback in catch/UI flow\n  ${line.trim()}`
      );
    }
  }

  if (issues.length > 0) {
    console.error(
      `API error-surface guard failed with ${issues.length} issue${
        issues.length === 1 ? "" : "s"
      }:`
    );
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    console.error(
      `Use centralized error helpers or annotate rare exceptions with "${allowMarker}".`
    );
    process.exit(1);
  }

  console.log("API error-surface guard passed.");
}

main();
