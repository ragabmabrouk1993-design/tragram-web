import { NextRequest, NextResponse } from "next/server";
import { proxy } from "./proxy";
import { isBillingDisabledInServerEnv } from "@/lib/runtime-environment";
import { locales } from "@/i18n/routing-config";

jest.mock("next-intl/middleware", () => ({
  __esModule: true,
  default: (config?: {localeCookie?: false}) => () => {
    const response=NextResponse.next();
    if(config?.localeCookie !== false) response.cookies.set('NEXT_LOCALE','en');
    return response;
  },
}));
jest.mock("@/lib/i18n", () => ({
  getLocaleFromPathname: () => "en",
  localeCookieName: "NEXT_LOCALE",
  localizePath: (_locale: string, pathname: string) => `/en${pathname}`,
  stripLocaleFromPathname: (pathname: string) => {
    const { locales: supported } = jest.requireActual("@/i18n/routing-config");
    const parts = pathname.split('/');
    return supported.includes(parts[1]) ? '/' + parts.slice(2).join('/') : pathname;
  },
}));
jest.mock("@/lib/locale-resolution", () => ({ resolveLocale: () => "en" }));
jest.mock("@/lib/runtime-environment", () => ({
  isBillingDisabledInServerEnv: jest.fn(() => false),
  isLocalServerEnv: () => true,
}));
jest.mock("@/lib/country-detection-server", () => ({
  getCountryAccessServer: async () => ({ isAllowed: true }),
}));
jest.mock("@/i18n/routing", () => ({ routing: {} }));

function request(pathname: string, hostname: string): NextRequest {
  return new NextRequest(`https://${hostname}${pathname}`, {
    headers: {
      host: hostname,
      "x-forwarded-host": hostname,
    },
  });
}

describe("host-aware search indexing proxy", () => {
  test.each(['/en','/ar/features','/en/blog/copy-telegram-signals-from-phone'])('public navigation %s preserves locale cookies', async path => {
    const response=await proxy(request(path,'tragram.app'));
    expect(response.cookies.get('NEXT_LOCALE')).toBeUndefined();
  });
  test.each(['/tr/auth/login','/ar/profile/language','/en/unknown-page'])('non-content routing %s retains existing locale handling', async path => {
    const response=await proxy(request(path,'tragram.app'));
    expect(response.cookies.get('NEXT_LOCALE')?.value).toBe('en');
  });
  beforeEach(() => {
    jest.mocked(isBillingDisabledInServerEnv).mockReturnValue(false);
  });

  test.each(locales)('keeps every billing prefix blocked for %s', async locale => {
    jest.mocked(isBillingDisabledInServerEnv).mockReturnValue(true);
    for (const path of ['/pricing', '/profile/subscription', '/profile/subscription/detail', '/profile/invoices', '/profile/invoices/example']) {
      const response = await proxy(request(`/${locale}${path}`, 'staging.tragram.app'));
      expect(response.status).toBe(404);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow, noarchive');
    }
  });

  test.each(['tr', 'ar-EG', 'en-US'])('redirects %s once and preserves the query', async locale => {
    const response = await proxy(request(`/${locale}/features?ref=example`, 'staging.tragram.app'));
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(`https://staging.tragram.app/${locale.startsWith('ar') ? 'ar' : 'en'}/features?ref=example`);
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow, noarchive');
  });

  test("serves a staging-only robots policy", async () => {
    const response = await proxy(request("/robots.txt", "staging.tragram.app"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(response.headers.get("x-robots-tag")).toBe(
      "noindex, nofollow, noarchive"
    );
    await expect(response.text()).resolves.toBe("User-agent: *\nDisallow: /\n");
  });

  test("hides the sitemap on staging", async () => {
    const response = await proxy(request("/sitemap.xml", "staging.tragram.app"));

    expect(response.status).toBe(404);
    expect(response.headers.get("x-robots-tag")).toBe(
      "noindex, nofollow, noarchive"
    );
  });

  test("adds noindex headers to staging pages", async () => {
    const response = await proxy(request("/en", "staging.tragram.app"));

    expect(response.headers.get("x-robots-tag")).toBe(
      "noindex, nofollow, noarchive"
    );
  });

  test("does not add noindex headers to canonical pages", async () => {
    const response = await proxy(request("/en", "tragram.app"));

    expect(response.headers.has("x-robots-tag")).toBe(false);
  });

  test.each([
    "/en/profile/subscription",
    "/en/profile/invoices",
    "/en/pricing",
  ])("blocks billing route %s when free mode is enabled", async (pathname) => {
    jest.mocked(isBillingDisabledInServerEnv).mockReturnValue(true);

    const response = await proxy(request(pathname, "staging.tragram.app"));

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  test("preserves billing routes in standard billing mode", async () => {
    const response = await proxy(
      request("/en/profile/subscription", "tragram.app")
    );

    expect(response.status).toBe(200);
  });
});
