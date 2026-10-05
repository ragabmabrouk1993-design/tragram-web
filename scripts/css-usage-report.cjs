#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const webappRoot = path.resolve(__dirname, "..");
const outputJsonPath = path.join(webappRoot, "css-usage-report.json");
const outputMdPath = path.join(webappRoot, "css-usage-report.md");

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function relFromWebapp(filePath) {
  return toPosixPath(path.relative(webappRoot, filePath));
}

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

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function collectRelativeCssSpecifiers(sourceText) {
  const specs = [];
  const patterns = [
    /import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+\.css)['"]/g,
    /@import\s+['"]([^'"]+\.css)['"]/g,
    /href=["']([^"']+\.css)["']/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(sourceText)) !== null) {
      const spec = match[1];
      if (!spec.startsWith(".")) continue;
      specs.push(spec);
    }
  }
  return specs;
}

function main() {
  const srcRoot = path.join(webappRoot, "src");
  const publicRoot = path.join(webappRoot, "public");

  const cssFiles = [
    ...walkFiles(srcRoot, (filePath) => filePath.endsWith(".css")),
    ...walkFiles(publicRoot, (filePath) => filePath.endsWith(".css")),
  ].sort((a, b) => a.localeCompare(b));

  const sourceFiles = walkFiles(webappRoot, (filePath) =>
    /\.(css|tsx|ts|jsx|js|html)$/.test(filePath)
  );

  const importersByCssPath = new Map(cssFiles.map((filePath) => [filePath, new Set()]));

  for (const sourceFilePath of sourceFiles) {
    const sourceText = readText(sourceFilePath);
    const specs = collectRelativeCssSpecifiers(sourceText);
    if (specs.length === 0) continue;

    for (const spec of specs) {
      const resolved = path.resolve(path.dirname(sourceFilePath), spec);
      if (!importersByCssPath.has(resolved)) continue;
      importersByCssPath.get(resolved).add(relFromWebapp(sourceFilePath));
    }
  }

  const rows = cssFiles.map((cssPath) => {
    const bytes = fs.statSync(cssPath).size;
    const lines = readText(cssPath).split("\n").length;
    const importers = [...(importersByCssPath.get(cssPath) ?? new Set())].sort();
    return {
      path: relFromWebapp(cssPath),
      bytes,
      lines,
      importers,
      isReferenced: importers.length > 0,
    };
  });

  const totals = rows.reduce(
    (acc, row) => {
      acc.totalFiles += 1;
      acc.totalBytes += row.bytes;
      if (row.isReferenced) acc.referencedBytes += row.bytes;
      else acc.unreferencedBytes += row.bytes;
      if (row.path.startsWith("public/")) {
        acc.publicBytes += row.bytes;
      } else if (row.path.startsWith("src/")) {
        acc.srcBytes += row.bytes;
      }
      return acc;
    },
    {
      totalFiles: 0,
      totalBytes: 0,
      referencedBytes: 0,
      unreferencedBytes: 0,
      srcBytes: 0,
      publicBytes: 0,
    }
  );

  const generatedAt = new Date().toISOString();
  const jsonReport = {
    generatedAt,
    totals,
    rows,
  };

  fs.writeFileSync(outputJsonPath, JSON.stringify(jsonReport, null, 2), "utf8");

  const mdLines = [];
  mdLines.push("# CSS Usage Report");
  mdLines.push("");
  mdLines.push(`Generated: ${generatedAt}`);
  mdLines.push("");
  mdLines.push(`- Total CSS files: \`${totals.totalFiles}\``);
  mdLines.push(`- Total bytes: \`${totals.totalBytes.toLocaleString()}\``);
  mdLines.push(`- Referenced bytes: \`${totals.referencedBytes.toLocaleString()}\``);
  mdLines.push(`- Unreferenced bytes: \`${totals.unreferencedBytes.toLocaleString()}\``);
  mdLines.push(`- src bytes: \`${totals.srcBytes.toLocaleString()}\``);
  mdLines.push(`- public bytes: \`${totals.publicBytes.toLocaleString()}\``);
  mdLines.push("");
  mdLines.push("path|bytes|lines|imported_by");
  mdLines.push("---|---:|---:|---");

  for (const row of rows) {
    mdLines.push(
      `${row.path}|${row.bytes}|${row.lines}|${
        row.importers.length > 0 ? row.importers.join("<br>") : "UNREFERENCED"
      }`
    );
  }

  fs.writeFileSync(outputMdPath, `${mdLines.join("\n")}\n`, "utf8");

  console.log(`Wrote ${relFromWebapp(outputJsonPath)}`);
  console.log(`Wrote ${relFromWebapp(outputMdPath)}`);
}

main();
