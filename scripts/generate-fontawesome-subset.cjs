#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const webappRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(webappRoot, "src");
const sourceCssPath = path.join(
  webappRoot,
  "src",
  "app",
  "[lang]",
  "marketing",
  "styles",
  "all.min.css"
);
const outputCssPath = path.join(
  webappRoot,
  "src",
  "app",
  "styles",
  "vendor",
  "fontawesome-app-subset.css"
);

const FONT_PLUMBING = [
  ':host,:root{--fa-family-brands:"Font Awesome 7 Brands";--fa-font-brands:normal 400 1em/1 var(--fa-family-brands)}',
  '@font-face{font-family:"Font Awesome 7 Brands";font-style:normal;font-weight:400;font-display:block;src:url(/webfonts/fa-brands-400.woff2)}',
  '.fa-brands,.fa-classic.fa-brands,.fab{--fa-family:var(--fa-family-brands);--fa-style:400}',
  ':host,:root{--fa-family-classic:"Font Awesome 7 Free";--fa-font-solid:normal 900 1em/1 var(--fa-family-classic);--fa-style-family-classic:var(--fa-family-classic)}',
  ':host,:root{--fa-font-regular:normal 400 1em/1 var(--fa-family-classic)}',
  '@font-face{font-family:"Font Awesome 7 Free";font-style:normal;font-weight:400;font-display:block;src:url(/webfonts/fa-regular-400.woff2)}',
  '@font-face{font-family:"Font Awesome 7 Free";font-style:normal;font-weight:900;font-display:block;src:url(/webfonts/fa-solid-900.woff2)}',
  '.fa-regular,.far{--fa-style:400}',
  '.fa-solid,.fas{--fa-style:900}',
  '.fa-classic,.fas,.far{--fa-family:var(--fa-family-classic)}',
].join("");

const NON_ICON_CLASSES = new Set([
  "fa-solid",
  "fa-regular",
  "fa-brands",
  "fa-classic",
  "fa",
  "fas",
  "far",
  "fab",
  "fa-spin",
  "fa-spin-reverse",
  "fa-spin-pulse",
  "fa-pulse",
  "fa-beat",
  "fa-bounce",
  "fa-fade",
  "fa-beat-fade",
  "fa-flip",
  "fa-shake",
  "fa-fw",
  "fa-width-auto",
  "fa-width-fixed",
  "fa-ul",
  "fa-li",
  "fa-border",
  "fa-pull-left",
  "fa-pull-right",
  "fa-pull-start",
  "fa-pull-end",
  "fa-rotate-90",
  "fa-rotate-180",
  "fa-rotate-270",
  "fa-rotate-by",
  "fa-flip-horizontal",
  "fa-flip-vertical",
  "fa-flip-both",
  "fa-stack",
  "fa-stack-1x",
  "fa-stack-2x",
  "fa-inverse",
  "fa-xs",
  "fa-sm",
  "fa-lg",
  "fa-xl",
  "fa-2xl",
  "fa-2xs",
  "fa-1x",
  "fa-2x",
  "fa-3x",
  "fa-4x",
  "fa-5x",
  "fa-6x",
  "fa-7x",
  "fa-8x",
  "fa-9x",
  "fa-10x",
]);

function walkFiles(dirPath, fileFilter) {
  const out = [];
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

function getModernIconClassSet() {
  const codeFiles = walkFiles(srcRoot, (filePath) => /\.(tsx|ts|jsx|js)$/.test(filePath));
  const iconClasses = new Set();
  const classRegex = /fa-[a-z0-9-]+/g;

  for (const filePath of codeFiles) {
    const text = fs.readFileSync(filePath, "utf8");
    let match;
    while ((match = classRegex.exec(text)) !== null) {
      iconClasses.add(match[0]);
    }
  }

  for (const className of NON_ICON_CLASSES) {
    iconClasses.delete(className);
  }

  return iconClasses;
}

function generateSubsetCss(sourceCss, requiredIcons) {
  const iconDefsStart = sourceCss.indexOf(".fa-0{");
  if (iconDefsStart === -1) {
    throw new Error("Could not find icon definition start (.fa-0{) in all.min.css");
  }

  const prelude = sourceCss.slice(0, iconDefsStart);
  const iconDefs = sourceCss.slice(iconDefsStart);

  const blockRegex = /(\.fa-[a-z0-9-]+(?:,\.fa-[a-z0-9-]+)*)\{--fa:"[^"]*"\}/g;
  const selectedBlocks = [];
  const found = new Set();

  let match;
  while ((match = blockRegex.exec(iconDefs)) !== null) {
    const selectors = match[1]
      .split(",")
      .map((selector) => selector.replace(/^\./, "").trim())
      .filter(Boolean);
    if (!selectors.some((selector) => requiredIcons.has(selector))) continue;

    selectedBlocks.push(match[0]);
    for (const selector of selectors) {
      if (requiredIcons.has(selector)) {
        found.add(selector);
      }
    }
  }

  const missing = [...requiredIcons].filter((iconClass) => !found.has(iconClass)).sort();
  if (missing.length > 0) {
    throw new Error(`Missing ${missing.length} icon definitions in source CSS: ${missing.join(", ")}`);
  }

  const output = `${prelude}${selectedBlocks.join("")}${FONT_PLUMBING}\n`;
  return output;
}

function main() {
  if (!fs.existsSync(sourceCssPath)) {
    throw new Error(`Source CSS not found: ${sourceCssPath}`);
  }

  const requiredIcons = getModernIconClassSet();
  if (requiredIcons.size === 0) {
    throw new Error("No Font Awesome icon classes detected in modern app code.");
  }

  const sourceCss = fs.readFileSync(sourceCssPath, "utf8");
  const subsetCss = generateSubsetCss(sourceCss, requiredIcons);

  fs.mkdirSync(path.dirname(outputCssPath), { recursive: true });
  fs.writeFileSync(outputCssPath, subsetCss, "utf8");

  const sourceBytes = Buffer.byteLength(sourceCss, "utf8");
  const subsetBytes = Buffer.byteLength(subsetCss, "utf8");
  const savingsBytes = sourceBytes - subsetBytes;
  const savingsPercent = ((savingsBytes / sourceBytes) * 100).toFixed(2);

  console.log(`Wrote ${path.relative(webappRoot, outputCssPath)}`);
  console.log(`Required icons: ${requiredIcons.size}`);
  console.log(`Source size: ${sourceBytes.toLocaleString()} bytes`);
  console.log(`Subset size: ${subsetBytes.toLocaleString()} bytes`);
  console.log(`Savings: ${savingsBytes.toLocaleString()} bytes (${savingsPercent}%)`);
}

main();
