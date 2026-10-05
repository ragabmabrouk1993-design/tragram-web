#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const https = require("https");

const EXNESS_FLAGS_URL = "https://www.exness.com/static/flags.svg";
const ROOT = path.resolve(__dirname, "..");
const OUTPUT_SVG_PATH = path.join(ROOT, "public", "static", "flags.svg");
const OUTPUT_MANIFEST_PATH = path.join(
  ROOT,
  "src",
  "components",
  "symbols",
  "flags-sprite-manifest.ts"
);

const fetchText = (url, redirectCount = 0) =>
  new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error("Too many redirects while fetching sprite source"));
      return;
    }

    const request = https.request(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; tragram-webapp/1.0; +https://tragram.com)",
          Accept: "image/svg+xml,text/plain,*/*",
        },
      },
      (response) => {
        const { statusCode, headers } = response;
        if (!statusCode) {
          reject(new Error("Missing HTTP status code"));
          return;
        }

        if (
          statusCode >= 300 &&
          statusCode < 400 &&
          typeof headers.location === "string" &&
          headers.location.length > 0
        ) {
          response.resume();
          const redirectedUrl = new URL(headers.location, url).toString();
          resolve(fetchText(redirectedUrl, redirectCount + 1));
          return;
        }

        if (statusCode < 200 || statusCode >= 300) {
          response.resume();
          reject(new Error(`Failed to fetch sprite source: HTTP ${statusCode}`));
          return;
        }

        response.setEncoding("utf8");
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => resolve(body));
      }
    );

    request.on("error", reject);
    request.end();
  });

const extractRootDefsBlock = (source) => {
  const defsMatch = source.match(/<defs\b[\s\S]*?<\/defs>/i);
  return defsMatch ? defsMatch[0] : "";
};

const extractSymbolBlocks = (source) => {
  const tagPattern = /<\/?symbol\b[^>]*>/gi;
  const stack = [];
  const blocks = [];
  let match;

  while ((match = tagPattern.exec(source))) {
    const tag = match[0];
    const isClosingTag = tag.startsWith("</");

    if (!isClosingTag) {
      const idMatch = tag.match(/\bid=\"([^\"]+)\"/i);
      stack.push({
        startIndex: match.index,
        id: idMatch ? idMatch[1] : null,
      });
      continue;
    }

    const opened = stack.pop();
    if (!opened || !opened.id) {
      continue;
    }

    const endIndex = tagPattern.lastIndex;
    const block = source.slice(opened.startIndex, endIndex);
    blocks.push({
      id: opened.id,
      block,
    });
  }

  return blocks;
};

const normalizeSymbolId = (id) => id.trim().toLowerCase();

const normalizeSymbolOpenTagId = (symbolBlock, normalizedId) =>
  symbolBlock.replace(
    /(<symbol\b[^>]*\bid=\")([^\"]+)(\")/i,
    `$1${normalizedId}$3`
  );

const compactKey = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const buildManifestContent = (ids) => {
  const aliasEntries = [];
  for (const id of ids) {
    const compact = compactKey(id);
    if (!compact || compact === id) {
      continue;
    }
    aliasEntries.push([compact, id]);
  }

  aliasEntries.sort((a, b) => a[0].localeCompare(b[0]));

  const idsBody = ids.map((id) => `  "${id}",`).join("\n");
  const aliasBody = aliasEntries
    .map(([key, id]) => `  "${key}": "${id}",`)
    .join("\n");

  return `export const FLAGS_SPRITE_PATH = "/static/flags.svg";\n\nexport const FLAGS_SPRITE_IDS = [\n${idsBody}\n] as const;\n\nexport type FlagsSpriteId = (typeof FLAGS_SPRITE_IDS)[number];\n\nexport const FLAGS_SPRITE_COMPACT_ALIASES: Readonly<Record<string, FlagsSpriteId>> = {\n${aliasBody}\n};\n`;
};

const run = async () => {
  const source = await fetchText(EXNESS_FLAGS_URL);
  const defsBlock = extractRootDefsBlock(source);
  const symbolBlocks = extractSymbolBlocks(source);

  const byId = new Map();
  for (const entry of symbolBlocks) {
    const normalizedId = normalizeSymbolId(entry.id);
    if (!normalizedId) {
      continue;
    }

    const normalizedBlock = normalizeSymbolOpenTagId(entry.block, normalizedId);
    byId.set(normalizedId, normalizedBlock);
  }

  const ids = Array.from(byId.keys()).sort((a, b) => a.localeCompare(b));

  const svgSections = [`<svg xmlns=\"http://www.w3.org/2000/svg\">`];
  if (defsBlock) {
    svgSections.push(defsBlock);
  }
  for (const id of ids) {
    const block = byId.get(id);
    if (block) {
      svgSections.push(block);
    }
  }
  svgSections.push("</svg>");
  const svgOutput = `${svgSections.join("\n\n")}\n`;

  fs.mkdirSync(path.dirname(OUTPUT_SVG_PATH), { recursive: true });
  fs.mkdirSync(path.dirname(OUTPUT_MANIFEST_PATH), { recursive: true });

  fs.writeFileSync(OUTPUT_SVG_PATH, svgOutput, "utf8");
  fs.writeFileSync(OUTPUT_MANIFEST_PATH, buildManifestContent(ids), "utf8");

  console.log(
    `Generated ${ids.length} sprite ids -> ${path.relative(ROOT, OUTPUT_SVG_PATH)} and ${path.relative(
      ROOT,
      OUTPUT_MANIFEST_PATH
    )}`
  );
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
