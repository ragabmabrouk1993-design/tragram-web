#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const postcss = require("postcss");
const selectorParser = require("postcss-selector-parser");

const webappRoot = path.resolve(__dirname, "..");

const filesToScope = [
  "src/app/[lang]/marketing/styles/bootstrap.min.css",
  "src/app/[lang]/marketing/styles/swiper-bundle.min.css",
  "src/app/[lang]/marketing/styles/all.min.css",
  "src/app/[lang]/marketing/styles/animate.css",
  "src/app/[lang]/marketing/styles/mousecursor.css",
  "src/app/styles/legacy/core.css",
  "src/app/styles/legacy/legacy-pages.css",
  "src/app/styles/legacy/marketing-landing.css",
];

const ROOT_SCOPE = "#public-route-root";
const GENERATED_SUFFIX = ".public-scoped.css";

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

function getOutputPath(inputPath) {
  const ext = path.extname(inputPath);
  const base = inputPath.slice(0, -ext.length);
  return `${base}${GENERATED_SUFFIX}`;
}

function scopeSelector(selector) {
  const trimmed = selector.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (trimmed.includes(ROOT_SCOPE)) {
    return trimmed;
  }

  if (trimmed === ":root" || trimmed === ":host" || trimmed === "html" || trimmed === "body") {
    return ROOT_SCOPE;
  }

  if (trimmed === "html.appzen-home2" || trimmed === "html.appzen-home2 body") {
    return ROOT_SCOPE;
  }

  if (trimmed.startsWith("html.appzen-home2 ")) {
    const suffix = trimmed.slice("html.appzen-home2 ".length).trim();
    return suffix ? `${ROOT_SCOPE} ${suffix}` : ROOT_SCOPE;
  }

  if (trimmed.startsWith("html")) {
    const htmlDescendantMatch = trimmed.match(/^(html(?:\[[^\]]+\])?(?:\.[^\s]+)*)\s+(.+)$/);
    if (htmlDescendantMatch) {
      const [, htmlSelector, restSelector] = htmlDescendantMatch;
      if (htmlSelector === "html" && restSelector.startsWith("body")) {
        const nested = restSelector.slice("body".length).trim();
        return nested ? `${ROOT_SCOPE} ${nested}` : ROOT_SCOPE;
      }
      return `${htmlSelector} ${ROOT_SCOPE} ${restSelector}`;
    }

    return `${trimmed} ${ROOT_SCOPE}`;
  }

  if (trimmed.startsWith(":root")) {
    return trimmed.replace(/^:root\b/, ROOT_SCOPE);
  }

  if (trimmed.startsWith(":host")) {
    return trimmed.replace(/^:host\b/, ROOT_SCOPE);
  }

  if (trimmed.startsWith("body")) {
    return trimmed.replace(/^body\b/, ROOT_SCOPE);
  }

  if (trimmed.startsWith("[data-bs-theme=")) {
    return `${ROOT_SCOPE}${trimmed}`;
  }

  return `${ROOT_SCOPE} ${trimmed}`;
}

function scopeSelectors(selectorValue) {
  return selectorParser((selectors) => {
    selectors.each((selectorNode) => {
      const rewritten = scopeSelector(selectorNode.toString());
      const rewrittenAst = selectorParser().astSync(rewritten);
      const replacement = rewrittenAst.nodes[0];
      selectorNode.replaceWith(replacement);
    });
  }).processSync(selectorValue);
}

function scopeCssFile(relativeInputPath) {
  const inputPath = path.join(webappRoot, relativeInputPath);
  const outputPath = path.join(webappRoot, getOutputPath(relativeInputPath));
  const source = fs.readFileSync(inputPath, "utf8");
  const root = postcss.parse(source, { from: inputPath });

  root.walkRules((rule) => {
    if (isInsideKeyframes(rule)) {
      return;
    }
    if (!rule.selector) {
      return;
    }
    rule.selector = scopeSelectors(rule.selector);
  });

  const generatedHeader = [
    "/*",
    " * AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY.",
    ` * Source: ${relativeInputPath}`,
    ` * Scope: ${ROOT_SCOPE}`,
    " */",
    "",
  ].join("\n");

  fs.writeFileSync(outputPath, `${generatedHeader}${root.toString()}\n`, "utf8");
  return {
    inputPath,
    outputPath,
  };
}

function main() {
  const outputs = filesToScope.map(scopeCssFile);
  console.log("Generated scoped public CSS files:");
  outputs.forEach(({ inputPath, outputPath }) => {
    const inSize = fs.statSync(inputPath).size;
    const outSize = fs.statSync(outputPath).size;
    console.log(`- ${path.relative(webappRoot, inputPath)} -> ${path.relative(webappRoot, outputPath)} (${inSize} -> ${outSize} bytes)`);
  });
}

main();
