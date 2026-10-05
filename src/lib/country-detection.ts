import { getCountries, type CountryCode } from "libphonenumber-js";
import type { NextRequest } from "next/server";

const COUNTRY_HEADER_KEYS = [
    "x-tragram-country",
    "x-vercel-ip-country",
    "cf-ipcountry",
    "x-country-code",
    "x-forwarded-country",
] as const;

const supportedCountries = new Set<CountryCode>(getCountries());

const normalizeCountryCode = (value?: string | null): CountryCode | null => {
    if (!value) return null;
    const normalized = value.trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(normalized) && supportedCountries.has(normalized as CountryCode)) {
        return normalized as CountryCode;
    }
    return null;
};

const parseAcceptLanguage = (value?: string | null): CountryCode | null => {
    if (!value) return null;
    const candidates = value
        .split(",")
        .map((item) => item.split(";")[0].trim())
        .filter(Boolean);

    for (const candidate of candidates) {
        const parts = candidate.replace("_", "-").split("-");
        if (parts.length > 1) {
            const region = parts[1];
            const code = normalizeCountryCode(region);
            if (code) return code;
        }
    }
    return null;
};

type HeadersLike = Pick<Headers, "get">;

export const detectCountryFromHeaders = (headers: HeadersLike): CountryCode | null => {
    for (const key of COUNTRY_HEADER_KEYS) {
        const headerValue = headers.get(key);
        const code = normalizeCountryCode(headerValue);
        if (code) {
            return code;
        }
    }

    const acceptLanguage = headers.get("accept-language");
    const parsedFromLang = parseAcceptLanguage(acceptLanguage);
    if (parsedFromLang) {
        return parsedFromLang;
    }

    return null;
};

export const detectCountryFromRequest = (request: NextRequest): CountryCode | null =>
    detectCountryFromHeaders(request.headers);
