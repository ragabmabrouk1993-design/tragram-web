#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const webappRoot = path.resolve(__dirname, "..");
const appRoot = path.join(webappRoot, "src", "app");
const componentsRoot = path.join(webappRoot, "src", "components");
const stylesRoot = path.join(appRoot, "styles");
const originalGlobalCssPath = path.join(appRoot, "original_global.css");
const allowAppzenLegacyFallback = process.env.ALLOW_APPZEN_LEGACY_FALLBACK === "1";

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function relFromWebapp(filePath) {
  return toPosixPath(path.relative(webappRoot, filePath));
}

function fileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

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

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function extractCssImports(sourceText) {
  const imports = [];
  const importRegex = /import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+\.css)['"]/g;
  let match;
  while ((match = importRegex.exec(sourceText)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

function extractCssAtImports(cssText) {
  const imports = [];
  const importRegex = /@import\s+(?:url\()?["']([^"']+\.css)["']\)?\s*;/g;
  let match;
  while ((match = importRegex.exec(cssText)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

function extractCssClasses(cssText) {
  const classes = new Set();
  const classRegex = /\.([_a-zA-Z][_a-zA-Z0-9-]*)/g;
  let match;
  while ((match = classRegex.exec(cssText)) !== null) {
    classes.add(match[1]);
  }
  return classes;
}

function extractUsedClassesFromCode(sourceText) {
  const classes = new Set();
  const addClasses = (value) => {
    value.split(/\s+/).forEach((candidate) => {
      if (!candidate) return;
      if (/[{}$:`]/.test(candidate)) return;
      if (candidate.includes("[") || candidate.includes("]")) return;
      classes.add(candidate);
    });
  };

  const patterns = [
    /className\s*=\s*"([^"]+)"/g,
    /className\s*=\s*'([^']+)'/g,
    /className\s*=\s*\{`([^`]+)`\}/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(sourceText)) !== null) {
      addClasses(match[1]);
    }
  }
  return classes;
}

function hasClassDefinition(cssText, className) {
  const escaped = className.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  return new RegExp(`\\.${escaped}(?![a-zA-Z0-9_-])`).test(cssText);
}

function hasScopedLegacyDefinition(cssText, className) {
  const escaped = className.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  return new RegExp(`html\\.appzen-home2[^\\n{]*\\.${escaped}(?![a-zA-Z0-9_-])`).test(
    cssText
  );
}

function getImportsByFile(codeFiles) {
  const importsByFile = new Map();
  for (const filePath of codeFiles) {
    const rel = relFromWebapp(filePath);
    importsByFile.set(rel, extractCssImports(readText(filePath)));
  }
  return importsByFile;
}

function assertRequiredImports(issues, importsByFile, relFile, requiredImports) {
  const imports = new Set(importsByFile.get(relFile) ?? []);
  for (const required of requiredImports) {
    if (!imports.has(required)) {
      issues.push(`${relFile} is missing required CSS import: ${required}`);
    }
  }
}

function assertAnyRequiredImport(issues, importsByFile, relFile, requiredImports, label) {
  const imports = new Set(importsByFile.get(relFile) ?? []);
  const hasAny = requiredImports.some((required) => imports.has(required));
  if (!hasAny) {
    issues.push(
      `${relFile} is missing ${label}. Expected one of: ${requiredImports.join(", ")}`
    );
  }
}

function assertForbiddenImportPatterns(issues, importsByFile, relFile, forbiddenRegexes) {
  const imports = importsByFile.get(relFile) ?? [];
  for (const imported of imports) {
    for (const forbiddenRegex of forbiddenRegexes) {
      if (forbiddenRegex.test(imported)) {
        issues.push(
          `${relFile} has forbidden CSS import "${imported}" (matched ${forbiddenRegex})`
        );
      }
    }
  }
}

function main() {
  const issues = [];

  const appCodeFiles = walkFiles(appRoot, (filePath) =>
    /\.(tsx|ts|jsx|js)$/.test(filePath)
  );
  const componentCodeFiles = walkFiles(componentsRoot, (filePath) =>
    /\.(tsx|ts|jsx|js)$/.test(filePath)
  );
  const allCodeFiles = [...appCodeFiles, ...componentCodeFiles];
  const importsByFile = getImportsByFile(appCodeFiles);

  const rootLayout = "src/app/[lang]/layout.tsx";
  const legacyLayout = "src/app/[lang]/(public)/layout.tsx";
  const notFoundPage = "src/app/[lang]/not-found.tsx";
  const dashboardLayout = "src/app/[lang]/dashboard/layout.tsx";
  const channelsLayout = "src/app/[lang]/channels/layout.tsx";
  const reportsLayout = "src/app/[lang]/reports/layout.tsx";
  const profileLayout = "src/app/[lang]/profile/layout.tsx";
  const authLayout = "src/app/[lang]/auth/layout.tsx";
  const profileContactPage = "src/app/[lang]/profile/contact/page.tsx";
  const legacyIndexPage = "src/app/[lang]/(public)/page.tsx";

  const requiredFiles = [
    rootLayout,
    legacyLayout,
    notFoundPage,
    dashboardLayout,
    channelsLayout,
    reportsLayout,
    profileLayout,
    authLayout,
    profileContactPage,
    legacyIndexPage,
  ];

  for (const relFile of requiredFiles) {
    const absPath = path.join(webappRoot, relFile);
    if (!fileExists(absPath)) {
      issues.push(`Required route file missing: ${relFile}`);
    }
  }

  assertRequiredImports(issues, importsByFile, rootLayout, ["../globals.css"]);
  assertForbiddenImportPatterns(issues, importsByFile, rootLayout, [
    /marketing\/styles\/.*\.css$/,
    /styles\/legacy\//,
    /styles\/pages\/auth\.css$/,
  ]);

  const legacyVendorImports = [
    "../marketing/styles/bootstrap.min.public-scoped.css",
    "../marketing/styles/swiper-bundle.min.public-scoped.css",
    "../marketing/styles/animate.public-scoped.css",
    "../marketing/styles/mousecursor.public-scoped.css",
    "../../styles/legacy/core.public-scoped.css",
    "../../styles/legacy/legacy-pages.public-scoped.css",
    "../../styles/legacy/marketing-landing.public-scoped.css",
    "../../styles/pages/public-marketing.css",
    "../../styles/pages/public-parity.css",
  ];
  assertRequiredImports(issues, importsByFile, legacyLayout, legacyVendorImports);
  assertAnyRequiredImport(
    issues,
    importsByFile,
    legacyLayout,
    [
      "../marketing/styles/all.min.public-scoped.css",
      "../../styles/vendor/fontawesome-app-subset.css",
    ],
    "public route icon CSS import"
  );
  const legacyLayoutForbiddenImports = [
    /styles\/legacy\/(?!.*\.public-scoped\.css$).*\.css$/,
    /marketing\/styles\/(bootstrap\.min|swiper-bundle\.min|all\.min|animate)\.css$/,
    /marketing\/styles\/mousecursor\.css$/,
  ];
  if (!allowAppzenLegacyFallback) {
    legacyLayoutForbiddenImports.push(/slicknav\.min\.css$/, /magnific-popup\.css$/);
  }
  assertForbiddenImportPatterns(
    issues,
    importsByFile,
    legacyLayout,
    legacyLayoutForbiddenImports
  );

  const publicScopedArtifacts = [
    "src/app/[lang]/marketing/styles/bootstrap.min.public-scoped.css",
    "src/app/[lang]/marketing/styles/swiper-bundle.min.public-scoped.css",
    "src/app/[lang]/marketing/styles/all.min.public-scoped.css",
    "src/app/[lang]/marketing/styles/animate.public-scoped.css",
    "src/app/[lang]/marketing/styles/mousecursor.public-scoped.css",
    "src/app/styles/legacy/core.public-scoped.css",
    "src/app/styles/legacy/legacy-pages.public-scoped.css",
    "src/app/styles/legacy/marketing-landing.public-scoped.css",
  ];
  for (const relFile of publicScopedArtifacts) {
    const absPath = path.join(webappRoot, relFile);
    if (!fileExists(absPath)) {
      issues.push(`Missing scoped public CSS artifact: ${relFile}`);
    }
  }

  const publicMarketingEntrypoint = "src/app/styles/pages/public-marketing.css";
  const publicMarketingPath = path.join(webappRoot, publicMarketingEntrypoint);
  if (!fileExists(publicMarketingPath)) {
    issues.push(`Missing required public CSS entrypoint: ${publicMarketingEntrypoint}`);
  } else {
    const publicMarketingImports = extractCssAtImports(readText(publicMarketingPath));
    for (const imported of publicMarketingImports) {
      if (imported.includes("/legacy/")) {
        issues.push(
          `${publicMarketingEntrypoint} imports legacy CSS "${imported}". Import scoped legacy files from the public layout instead.`
        );
      }
    }
  }

  const modernAppIconImports = [
    "../../styles/vendor/fontawesome-app-subset.css",
    "../marketing/styles/all.min.css",
  ];
  const appShellSharedImports = ["../../styles/pages/dashboard-shared.css", "../../styles/pages/profile-shell.css"];
  const dashboardLayoutRequiredImports = [
    "../../styles/pages/dashboard.css",
    "../../styles/pages/profile-shell.css",
  ];

  assertRequiredImports(issues, importsByFile, dashboardLayout, dashboardLayoutRequiredImports);
  assertAnyRequiredImport(
    issues,
    importsByFile,
    dashboardLayout,
    modernAppIconImports,
    "modern app icon CSS import"
  );
  assertRequiredImports(issues, importsByFile, channelsLayout, [
    ...appShellSharedImports,
    "../../styles/pages/channels.css",
  ]);
  assertAnyRequiredImport(
    issues,
    importsByFile,
    channelsLayout,
    modernAppIconImports,
    "modern app icon CSS import"
  );
  assertRequiredImports(issues, importsByFile, reportsLayout, [
    ...appShellSharedImports,
    "../../styles/pages/reports.css",
  ]);
  assertAnyRequiredImport(
    issues,
    importsByFile,
    reportsLayout,
    modernAppIconImports,
    "modern app icon CSS import"
  );
  assertRequiredImports(issues, importsByFile, profileLayout, [
    ...appShellSharedImports,
    "../../styles/pages/profile.css",
  ]);
  assertAnyRequiredImport(
    issues,
    importsByFile,
    profileLayout,
    modernAppIconImports,
    "modern app icon CSS import"
  );
  assertForbiddenImportPatterns(issues, importsByFile, dashboardLayout, [/styles\/legacy\//]);
  assertForbiddenImportPatterns(issues, importsByFile, channelsLayout, [
    /styles\/legacy\//,
    /styles\/pages\/dashboard\.css$/,
  ]);
  assertForbiddenImportPatterns(issues, importsByFile, reportsLayout, [
    /styles\/legacy\//,
    /styles\/pages\/dashboard\.css$/,
  ]);
  assertForbiddenImportPatterns(issues, importsByFile, profileLayout, [
    /styles\/legacy\//,
    /styles\/pages\/dashboard\.css$/,
  ]);

  assertRequiredImports(issues, importsByFile, authLayout, ["../../styles/pages/auth.css"]);
  assertForbiddenImportPatterns(issues, importsByFile, authLayout, [
    /marketing\/styles\/.*\.css$/,
    /styles\/legacy\//,
  ]);

  assertRequiredImports(issues, importsByFile, profileContactPage, [
    "../../../styles/pages/contact.css",
  ]);

  const legacyPageImportMap = new Map([
    ["src/app/[lang]/(public)/faqs/page.tsx", "../../../styles/pages/public-faqs.css"],
    ["src/app/[lang]/(public)/help-center/page.tsx", "../../../styles/pages/public-legal.css"],
    [
      "src/app/[lang]/(public)/privacy-policy/page.tsx",
      "../../../styles/pages/public-legal.css",
    ],
    [
      "src/app/[lang]/(public)/terms-of-service/page.tsx",
      "../../../styles/pages/public-legal.css",
    ],
    [
      "src/app/[lang]/(public)/refund-policy/page.tsx",
      "../../../styles/pages/public-legal.css",
    ],
    [legacyIndexPage, "../../styles/pages/public-home.css"],
  ]);
  for (const [filePath, importPath] of legacyPageImportMap.entries()) {
    assertRequiredImports(issues, importsByFile, filePath, [importPath]);
  }

  for (const [relFile, imports] of importsByFile.entries()) {
    for (const imported of imports) {
      if (imported.endsWith("marketing/styles/custom.css")) {
        issues.push(`${relFile} imports forbidden legacy monolith CSS: ${imported}`);
      }
      if (imported.endsWith("marketing/styles/mousecursor.css")) {
        issues.push(
          `${relFile} imports forbidden unscoped cursor CSS: ${imported}. Use marketing/styles/mousecursor.public-scoped.css in public routes.`
        );
      }
      if (imported.endsWith("original_global.css")) {
        issues.push(`${relFile} imports forbidden source-of-truth backup CSS: ${imported}`);
      }
    }
  }

  const allowedDirectLegacyImports = new Set([]);
  for (const [relFile, imports] of importsByFile.entries()) {
    for (const imported of imports) {
      if (!/styles\/legacy\/.+\.css$/.test(imported)) continue;
      if (
        relFile === legacyLayout &&
        imported.endsWith(".public-scoped.css")
      ) {
        continue;
      }
      if (!allowedDirectLegacyImports.has(relFile)) {
        issues.push(
          `${relFile} directly imports legacy CSS "${imported}". Route-level code should import styles/pages entrypoints instead.`
        );
      }
    }
  }

  const styleFiles = walkFiles(stylesRoot, (filePath) => filePath.endsWith(".css"));
  const pageStyleFiles = walkFiles(path.join(stylesRoot, "pages"), (filePath) =>
    filePath.endsWith(".css")
  );
  const sharedStyleFiles = walkFiles(path.join(stylesRoot, "shared"), (filePath) =>
    filePath.endsWith(".css")
  );

  for (const filePath of pageStyleFiles) {
    const rel = relFromWebapp(filePath);
    if (rel.endsWith("styles/pages/profile-legacy-scaffold.css")) {
      continue;
    }
    const text = readText(filePath);
    if (/html\.appzen-home2/.test(text)) {
      issues.push(
        `${rel} contains forbidden html.appzen-home2 selector. Keep appzen-home2 selectors in legacy scoped files only.`
      );
    }
  }

  const routePrefixPattern =
    /\.(dashboard|channels|reports|profile|contact|auth|public)-[a-z0-9-]*/g;
  for (const filePath of sharedStyleFiles) {
    const rel = relFromWebapp(filePath);
    const text = readText(filePath);
    const matches = text.match(routePrefixPattern) ?? [];
    if (matches.length > 0) {
      const uniqueMatches = [...new Set(matches)].sort();
      issues.push(
        `${rel} contains route-specific selectors (${uniqueMatches.join(
          ", "
        )}). Move them to route/page styles.`
      );
    }
  }

  const styleClasses = new Set();
  for (const filePath of styleFiles) {
    extractCssClasses(readText(filePath)).forEach((className) => styleClasses.add(className));
  }

  const originalClasses = fileExists(originalGlobalCssPath)
    ? extractCssClasses(readText(originalGlobalCssPath))
    : new Set();

  const usedClasses = new Set();
  for (const filePath of allCodeFiles) {
    extractUsedClassesFromCode(readText(filePath)).forEach((className) =>
      usedClasses.add(className)
    );
  }

  const prefixedClassRegex =
    /^(dashboard|channels|reports|profile|contact|auth|language-switch|tg|reveal)[a-z0-9-]*$/;
  const usedPrefixedClasses = [...usedClasses].filter((className) =>
    prefixedClassRegex.test(className)
  );
  const missingPrefixedClasses = usedPrefixedClasses
    .filter((className) => !styleClasses.has(className))
    .sort();

  if (missingPrefixedClasses.length > 0) {
    issues.push(
      `Missing prefixed classes in modular styles: ${missingPrefixedClasses.join(", ")}`
    );
  }

  let usedSourceClasses = [];
  let missingUsedSourceClasses = [];
  if (originalClasses.size > 0) {
    usedSourceClasses = [...usedClasses].filter((className) =>
      originalClasses.has(className)
    );
    missingUsedSourceClasses = usedSourceClasses
      .filter((className) => !styleClasses.has(className))
      .sort();

    if (missingUsedSourceClasses.length > 0) {
      issues.push(
        `Classes used in code and present in original_global.css but missing from modular styles: ${missingUsedSourceClasses.join(
          ", "
        )}`
      );
    }
  }

  const pageStyleTexts = pageStyleFiles.map(readText);
  const sharedStyleTexts = sharedStyleFiles.map(readText);
  const legacyStyleTexts = walkFiles(path.join(stylesRoot, "legacy"), (filePath) =>
    filePath.endsWith(".css")
  ).map(readText);

  const nonLegacyRouteRoots = [
    path.join(appRoot, "[lang]", "dashboard"),
    path.join(appRoot, "[lang]", "channels"),
    path.join(appRoot, "[lang]", "reports"),
    path.join(appRoot, "[lang]", "profile"),
    path.join(appRoot, "[lang]", "auth"),
    path.join(appRoot, "[lang]", "onboarding"),
    path.join(appRoot, "[lang]", "restricted"),
  ];
  const nonLegacyComponentRoots = [
    path.join(componentsRoot, "dashboard"),
    path.join(componentsRoot, "channels"),
    path.join(componentsRoot, "profile"),
  ];

  const nonLegacyCodeFiles = [
    ...nonLegacyRouteRoots.flatMap((dirPath) =>
      fileExists(dirPath) ? walkFiles(dirPath, (filePath) => /\.(tsx|ts)$/.test(filePath)) : []
    ),
    ...nonLegacyComponentRoots.flatMap((dirPath) =>
      fileExists(dirPath) ? walkFiles(dirPath, (filePath) => /\.(tsx|ts)$/.test(filePath)) : []
    ),
  ];

  const nonLegacyUsedClasses = new Set();
  for (const filePath of nonLegacyCodeFiles) {
    extractUsedClassesFromCode(readText(filePath)).forEach((className) =>
      nonLegacyUsedClasses.add(className)
    );
  }

  const scopedLegacyOnlyClasses = [];
  for (const className of nonLegacyUsedClasses) {
    const inPageStyles = pageStyleTexts.some((text) => hasClassDefinition(text, className));
    const inSharedStyles = sharedStyleTexts.some((text) => hasClassDefinition(text, className));
    const inLegacyUnscoped = legacyStyleTexts.some(
      (text) => hasClassDefinition(text, className) && !hasScopedLegacyDefinition(text, className)
    );
    const inLegacyScoped = legacyStyleTexts.some((text) =>
      hasScopedLegacyDefinition(text, className)
    );

    if (!inPageStyles && !inSharedStyles && !inLegacyUnscoped && inLegacyScoped) {
      scopedLegacyOnlyClasses.push(className);
    }
  }

  if (scopedLegacyOnlyClasses.length > 0) {
    issues.push(
      `Non-legacy routes depend on html.appzen-home2-scoped legacy selectors: ${scopedLegacyOnlyClasses
        .sort()
        .join(", ")}`
    );
  }

  const summary = {
    files: {
      appCodeFiles: appCodeFiles.length,
      componentCodeFiles: componentCodeFiles.length,
      styleFiles: styleFiles.length,
    },
    metrics: {
      usedPrefixedCount: usedPrefixedClasses.length,
      missingPrefixedCount: missingPrefixedClasses.length,
      usedSourceClassCount: usedSourceClasses.length,
      missingUsedSourceClassCount: missingUsedSourceClasses.length,
      nonLegacyUsedClassCount: nonLegacyUsedClasses.size,
      scopedLegacyOnlyCount: scopedLegacyOnlyClasses.length,
      originalClassCount: originalClasses.size,
      modularClassCount: styleClasses.size,
    },
  };

  if (issues.length > 0) {
    console.error("CSS ownership audit failed.");
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    console.error(`Summary: ${JSON.stringify(summary, null, 2)}`);
    process.exit(1);
  }

  console.log("CSS ownership audit passed.");
  console.log(JSON.stringify(summary, null, 2));
}

main();
