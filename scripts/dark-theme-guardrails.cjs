#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const webappRoot = path.resolve(__dirname, "..");
const styleRoots = [
  path.join(webappRoot, "src", "app", "styles", "shared"),
  path.join(webappRoot, "src", "app", "styles", "pages"),
  path.join(webappRoot, "src", "app", "styles", "legacy"),
];
const componentsRoot = path.join(webappRoot, "src", "components");

const darkOnlyComponentFiles = [
  "src/components/i18n/language-switch.tsx",
  "src/components/phone/phone-input.tsx",
  "src/components/phone/country-select.tsx",
  "src/components/auth/otp-input.tsx",
  "src/components/auth/step-indicator.tsx",
  "src/components/form/password-field.tsx",
  "src/components/auth/auth-layout.tsx",
  "src/components/auth/auth-split-layout.tsx",
  "src/components/layout/header.tsx",
  "src/components/layout/navbar.tsx",
  "src/components/layout/footer.tsx",
];

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

function lineMatches(text, pattern) {
  const matcher = new RegExp(pattern.source, pattern.flags.replaceAll("g", ""));
  const lines = text.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (matcher.test(lines[i])) {
      out.push({ line: i + 1, content: lines[i].trim() });
    }
  }
  return out;
}

function addIssuesForPattern(issues, absFilePath, text, pattern, message) {
  const matches = lineMatches(text, pattern);
  for (const match of matches) {
    issues.push(
      `${relFromWebapp(absFilePath)}:${match.line} ${message}\n  ${match.content}`
    );
  }
}

function main() {
  const issues = [];

  const activeStyleFiles = styleRoots.flatMap((root) =>
    walkFiles(root, (filePath) => filePath.endsWith(".css"))
  );

  for (const filePath of activeStyleFiles) {
    const text = readText(filePath);
    addIssuesForPattern(
      issues,
      filePath,
      text,
      /:root\[data-theme=['"]light['"]\]/g,
      "light-theme selector is not allowed in active app styles"
    );
  }

  const componentFiles = walkFiles(componentsRoot, (filePath) =>
    /\.(tsx|ts|jsx|js)$/.test(filePath)
  );
  for (const filePath of componentFiles) {
    const text = readText(filePath);
    addIssuesForPattern(
      issues,
      filePath,
      text,
      /tone\?\s*:\s*(['"])dark\1\s*\|\s*\1light\1/g,
      "mixed tone union (dark | light) is not allowed"
    );
    addIssuesForPattern(
      issues,
      filePath,
      text,
      /tone\?\s*:\s*(['"])light\1\s*\|\s*\1dark\1/g,
      "mixed tone union (light | dark) is not allowed"
    );
    addIssuesForPattern(
      issues,
      filePath,
      text,
      /tone\s*=\s*(['"])light\1/g,
      "light tone default is not allowed"
    );
  }

  for (const relPath of darkOnlyComponentFiles) {
    const absPath = path.join(webappRoot, relPath);
    if (!fs.existsSync(absPath)) {
      issues.push(`${relPath} is missing from dark-only guardrails list`);
      continue;
    }
    const text = readText(absPath);
    addIssuesForPattern(
      issues,
      absPath,
      text,
      /\bbg-white\b(?!\/)/g,
      "forbidden light class token in dark-only component: bg-white"
    );
    addIssuesForPattern(
      issues,
      absPath,
      text,
      /\bborder-slate-200\b/g,
      "forbidden light class token in dark-only component: border-slate-200"
    );
    addIssuesForPattern(
      issues,
      absPath,
      text,
      /\btext-slate-900\b/g,
      "forbidden light class token in dark-only component: text-slate-900"
    );
  }

  if (issues.length > 0) {
    console.error(
      `Dark-theme guardrails failed with ${issues.length} issue${
        issues.length === 1 ? "" : "s"
      }:`
    );
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log("Dark-theme guardrails passed.");
}

main();
