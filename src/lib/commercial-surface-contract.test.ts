import fs from "node:fs";
import path from "node:path";
import { publicRouteManifest } from "@/content/public/route-manifest";

const sourceRoot = path.resolve(__dirname, "..");

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(sourceRoot, relativePath), "utf8");

const walkSourceFiles = (directory: string): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "api-client") return [];
      return walkSourceFiles(absolutePath);
    }
    if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) return [];
    return [absolutePath];
  });

describe("free Basic commercial surface contract", () => {
  test("every direct customer billing route is protected by the commercial-mode helper", () => {
    const billingRoutePattern =
      /["'`](?:\/\$\{[^}]+\})?\/(?:pricing|profile\/subscription|profile\/invoices)(?:["'`])/;
    const unguardedFiles = walkSourceFiles(sourceRoot)
      .filter((filePath) => billingRoutePattern.test(fs.readFileSync(filePath, "utf8")))
      .filter((filePath) => {
        // Pure route identities do not render links; their discovery policy is
        // asserted separately below. Continue auditing all UI consumers.
        if (["content/public/route-manifest.ts", "content/public/en.ts", "content/public/ar.ts"].includes(path.relative(sourceRoot, filePath))) return false;
        const source = fs.readFileSync(filePath, "utf8");
        return !source.includes("isBillingDisabledIn");
      })
      .map((filePath) => path.relative(sourceRoot, filePath));

    expect(unguardedFiles).toEqual([]);
    expect(publicRouteManifest.find(route => route.path === "/pricing")?.requiresBilling).toBe(true);
  });

  test("account surfaces use the canonical context in free Basic mode", () => {
    const guardedFetchSurfaces = [
      "components/layout/mobile-menu.tsx",
      "app/[lang]/profile/page.tsx",
      "app/[lang]/channels/channels-page-client.tsx",
    ];

    for (const relativePath of guardedFetchSurfaces) {
      const source = readSource(relativePath);
      expect(source).toContain("billingDisabled");
      expect(source).toContain("paymentService.getContext");
    }
  });

  test("subscription failures have a non-commercial free-mode path", () => {
    const errorSurfaces = [
      "app/[lang]/channels/channels-page-client.tsx",
      "app/[lang]/reports/page.tsx",
      "app/[lang]/dashboard/dashboard-page-client.tsx",
    ];

    for (const relativePath of errorSurfaces) {
      const source = readSource(relativePath);
      expect(source).toContain("billingDisabled");
      expect(source).toMatch(/subscriptionRequired|hasSubscriptionIssue/);
    }
  });

  test("existing homepage acquisition CTAs use signup while billing is disabled", () => {
    for (const relativePath of [
      "components/marketing/home/home-hero.tsx",
      "components/marketing/home/home-launch-cta.tsx",
    ]) {
      const source = readSource(relativePath);
      expect(source).toMatch(/billingDisabled\s*\?\s*["']\/auth\/signup["']\s*:\s*["']\/pricing["']/);
    }
  });
});
