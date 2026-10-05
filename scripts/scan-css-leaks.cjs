#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const postcss = require("postcss");

const webappRoot = path.resolve(__dirname, "..");
const stylesRoot = path.join(webappRoot, "src", "app", "styles");
const pagesStylesRoot = path.join(stylesRoot, "pages");
const sharedStylesRoot = path.join(stylesRoot, "shared");
const publicScopeRoot = "#public-route-root";

const appShellLayouts = [
  "src/app/[lang]/channels/layout.tsx",
  "src/app/[lang]/reports/layout.tsx",
  "src/app/[lang]/profile/layout.tsx",
];
const publicLayout = "src/app/[lang]/(public)/layout.tsx";

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function walk(dirPath, filter) {
  if (!fs.existsSync(dirPath)) return [];
  const out = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(fullPath, filter));
      continue;
    }
    if (!entry.isFile()) continue;
    if (filter && !filter(fullPath)) continue;
    out.push(fullPath);
  }
  return out;
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function isInsideKeyframes(rule) {
  let parent = rule.parent;
  while (parent) {
    if (
      parent.type === "atrule" &&
      typeof parent.name === "string" &&
      parent.name.toLowerCase().includes("keyframes")
    ) {
      return true;
    }
    parent = parent.parent;
  }
  return false;
}

function hasImport(source, importPath) {
  const escaped = importPath.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  return new RegExp(`import\\s+["']${escaped}["'];?`).test(source);
}

function main() {
  const issues = [];

  for (const relPath of appShellLayouts) {
    const absPath = path.join(webappRoot, relPath);
    if (!fs.existsSync(absPath)) {
      issues.push(`Missing expected app-shell layout file: ${relPath}`);
      continue;
    }
    const source = read(absPath);
    if (hasImport(source, "../../styles/pages/dashboard.css")) {
      issues.push(`${relPath} must not import ../../styles/pages/dashboard.css`);
    }
    if (!hasImport(source, "../../styles/pages/dashboard-shared.css")) {
      issues.push(`${relPath} must import ../../styles/pages/dashboard-shared.css`);
    }
  }

  const publicLayoutPath = path.join(webappRoot, publicLayout);
  if (!fs.existsSync(publicLayoutPath)) {
    issues.push(`Missing expected public layout file: ${publicLayout}`);
  } else {
    const source = read(publicLayoutPath);
    if (source.includes('<PublicCursor') && !hasImport(source, "../marketing/styles/mousecursor.public-scoped.css")) {
      issues.push(
        `${publicLayout} must import ../marketing/styles/mousecursor.public-scoped.css`
      );
    }
    if (hasImport(source, "../marketing/styles/mousecursor.css")) {
      issues.push(`${publicLayout} must not import ../marketing/styles/mousecursor.css`);
    }
  }

  const pageStyleFiles = walk(pagesStylesRoot, (filePath) => filePath.endsWith(".css"));
  for (const filePath of pageStyleFiles) {
    const rel = toPosix(path.relative(webappRoot, filePath));
    if (rel.endsWith("styles/pages/profile-legacy-scaffold.css")) {
      continue;
    }
    const text = read(filePath);
    if (/html\.appzen-home2/.test(text)) {
      issues.push(`${rel} contains html.appzen-home2 selector (forbidden in page styles).`);
    }

    const baseName = path.basename(filePath);
    if (!baseName.startsWith("public-")) {
      continue;
    }

    const ast = postcss.parse(text, { from: filePath });
    const unscopedSelectors = new Set();
    ast.walkRules((rule) => {
      if (isInsideKeyframes(rule) || !rule.selector) {
        return;
      }
      const selectors = rule.selector
        .split(",")
        .map((selector) => selector.trim())
        .filter(Boolean);
      for (const selector of selectors) {
        if (
          selector.includes(publicScopeRoot) ||
          selector.startsWith(":root") ||
          selector.startsWith(":host")
        ) {
          continue;
        }
        unscopedSelectors.add(selector);
      }
    });
    if (unscopedSelectors.size > 0) {
      const samples = [...unscopedSelectors].sort().slice(0, 8);
      issues.push(
        `${rel} has selectors not anchored to ${publicScopeRoot}: ${samples.join(", ")}`
      );
    }
  }

  const sharedStyleFiles = walk(sharedStylesRoot, (filePath) => filePath.endsWith(".css"));
  const routeSelectorPattern =
    /\.(dashboard|channels|reports|profile|contact|auth|public)-[a-z0-9-]*/g;
  for (const filePath of sharedStyleFiles) {
    const rel = toPosix(path.relative(webappRoot, filePath));
    const text = read(filePath);
    const matches = text.match(routeSelectorPattern);
    if (matches && matches.length > 0) {
      const unique = [...new Set(matches)].sort();
      issues.push(
        `${rel} contains route-specific selectors in shared layer: ${unique.join(", ")}`
      );
    }
  }

  if (issues.length > 0) {
    console.error("CSS leak scan failed:");
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log("CSS leak scan passed.");
}

main();
