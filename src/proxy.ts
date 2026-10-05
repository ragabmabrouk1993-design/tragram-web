import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { getCountryAccessServer } from "@/lib/country-detection-server";
import {
    getLocaleFromPathname,
    localeCookieName,
    localizePath,
    stripLocaleFromPathname,
} from "@/lib/i18n";
import { resolveLocale } from "@/lib/locale-resolution";
import {
    isBillingDisabledInServerEnv,
    isLocalServerEnv,
} from "@/lib/runtime-environment";
import {
    isNonIndexableHostname,
    stagingRobotsBody,
    stagingRobotsHeaderValue,
} from "@/lib/search-indexing";
import { routing } from "@/i18n/routing";
import { getPublicLocaleRedirect, isCanonicalPublicContentPathname } from "@/lib/public-locales";
import { buildFingerprintCspHeader } from "@/lib/fingerprint-csp";

const intlMiddleware = createIntlMiddleware(routing);
// Public content language must not overwrite the application's locale preference.
const publicIntlMiddleware = createIntlMiddleware({ ...routing, localeCookie: false });
const APP_ROUTE_PREFIXES = [
    "/auth",
    "/channels",
    "/dashboard",
    "/onboarding",
    "/profile",
    "/ref",
    "/referrals",
    "/reports",
    "/restricted",
] as const;
const BILLING_ROUTE_PREFIXES = [
    "/pricing",
    "/profile/subscription",
    "/profile/invoices",
] as const;

function isBillingRoute(pathname: string): boolean {
    return BILLING_ROUTE_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
}

function shouldStripAlternateLinks(pathname: string): boolean {
    const normalizedPathname = stripLocaleFromPathname(pathname);
    return APP_ROUTE_PREFIXES.some((prefix) =>
        normalizedPathname === prefix || normalizedPathname.startsWith(`${prefix}/`)
    );
}

const shouldEnforceCountryAccess = (pathname: string) => {
    const normalizedPathname = stripLocaleFromPathname(pathname);
    return APP_ROUTE_PREFIXES.some(
        (prefix) =>
            normalizedPathname === prefix || normalizedPathname.startsWith(`${prefix}/`)
    );
};

export async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    const requestHostname =
        request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const isNonIndexableHost = isNonIndexableHostname(requestHostname);

    if (pathname === "/robots.txt") {
        if (isNonIndexableHost) {
            return new NextResponse(stagingRobotsBody, {
                status: 200,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                    "X-Robots-Tag": stagingRobotsHeaderValue,
                },
            });
        }

        return NextResponse.next();
    }

    if (pathname === "/sitemap.xml") {
        if (isNonIndexableHost) {
            return new NextResponse(null, {
                status: 404,
                headers: { "X-Robots-Tag": stagingRobotsHeaderValue },
            });
        }

        return NextResponse.next();
    }

    if (isBillingDisabledInServerEnv() && isBillingRoute(stripLocaleFromPathname(pathname))) {
        return new NextResponse(null, {
            status: 404,
            headers: {
                "Cache-Control": "no-store",
                ...(isNonIndexableHost ? { "X-Robots-Tag": stagingRobotsHeaderValue } : {}),
            },
        });
    }

    const publicLocaleRedirect = getPublicLocaleRedirect(pathname);
    if (publicLocaleRedirect) {
        const url = request.nextUrl.clone();
        url.pathname = publicLocaleRedirect;
        const response = NextResponse.redirect(url, 308);
        if (isNonIndexableHost) response.headers.set("X-Robots-Tag", stagingRobotsHeaderValue);
        return response;
    }

    const pathnameLocale = getLocaleFromPathname(pathname);
    const resolvedLocale = pathnameLocale ?? resolveLocale({
        pathnameCandidates: [pathname],
        cookieLocale: request.cookies.get(localeCookieName)?.value,
        acceptLanguage: request.headers.get("accept-language"),
    });

    if (!isLocalServerEnv() && shouldEnforceCountryAccess(pathname)) {
        const restrictedPath = localizePath(resolvedLocale, "/restricted");
        if (pathname !== restrictedPath) {
            const countryAccess = await getCountryAccessServer(request.headers);
            if (!countryAccess.isAllowed) {
                const url = request.nextUrl.clone();
                url.pathname = restrictedPath;
                return NextResponse.redirect(url);
            }
        }
    }

    const response = isCanonicalPublicContentPathname(pathname)
        ? publicIntlMiddleware(request)
        : intlMiddleware(request);
    if (shouldStripAlternateLinks(pathname)) {
        response.headers.delete("Link");
    }
    if (isNonIndexableHost) {
        response.headers.set("X-Robots-Tag", stagingRobotsHeaderValue);
    }
    const analyticsCsp = buildFingerprintCspHeader({
        enabled: process.env.NEXT_PUBLIC_TRIAL_FINGERPRINT_ENABLED?.trim().toLowerCase() === "true",
        mode: process.env.NEXT_PUBLIC_FINGERPRINT_CSP_MODE,
        apiUrl: process.env.NEXT_PUBLIC_API_URL,
        endpoint: process.env.NEXT_PUBLIC_FINGERPRINT_ENDPOINT,
        mixpanelApiHost: process.env.MIXPANEL_API_HOST,
        mixpanelEnabled: process.env.MIXPANEL_ENABLED?.trim().toLowerCase() === "true",
    });
    if (analyticsCsp) response.headers.set(analyticsCsp.key, analyticsCsp.value);

    return response;
}

export const config = {
    matcher: ["/robots.txt", "/sitemap.xml", "/((?!_next|api|.*\\..*).*)"],
};
