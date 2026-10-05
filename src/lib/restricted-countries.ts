import { getCountries, type CountryCode } from "libphonenumber-js";

export type CountryAccessStatus = "ALLOWED" | "RESTRICTED" | "NOT_ALLOWED" | "UNKNOWN";

export type CountryPolicyItem = {
    code: CountryCode;
    name: string | null;
};

export type CountryAccessPolicy = {
    countryCode: CountryCode | null;
    countryName: string | null;
    source: string;
    accessStatus: CountryAccessStatus;
    isRestricted: boolean;
    isAllowed: boolean;
    allowedCountries: CountryPolicyItem[];
    restrictedCountries: CountryPolicyItem[];
};

const supportedCountries = new Set<CountryCode>(getCountries());

export const normalizeCountryCode = (value?: string | null): CountryCode | null => {
    if (!value) return null;
    const normalized = value.trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(normalized) && supportedCountries.has(normalized as CountryCode)) {
        return normalized as CountryCode;
    }
    return null;
};

export const normalizeCountryPolicyItems = (value: unknown): CountryPolicyItem[] => {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => {
            if (!item || typeof item !== "object") return null;
            const record = item as { code?: string | null; name?: string | null };
            const code = normalizeCountryCode(record.code);
            if (!code) return null;
            return {
                code,
                name: typeof record.name === "string" && record.name.trim() ? record.name.trim() : null,
            } satisfies CountryPolicyItem;
        })
        .filter((item): item is CountryPolicyItem => Boolean(item));
};

export const normalizeCountryAccessStatus = (value?: string | null): CountryAccessStatus => {
    if (
        value === "ALLOWED" ||
        value === "RESTRICTED" ||
        value === "NOT_ALLOWED" ||
        value === "UNKNOWN"
    ) {
        return value;
    }
    return "UNKNOWN";
};

export const normalizeCountryAccessPolicy = (value: unknown): CountryAccessPolicy => {
    const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    const accessStatus = normalizeCountryAccessStatus(
        typeof record.accessStatus === "string" ? record.accessStatus : null
    );

    return {
        countryCode: normalizeCountryCode(
            typeof record.countryCode === "string" ? record.countryCode : null
        ),
        countryName:
            typeof record.countryName === "string" && record.countryName.trim()
                ? record.countryName.trim()
                : null,
        source: typeof record.source === "string" ? record.source : "UNKNOWN",
        accessStatus,
        isRestricted:
            typeof record.isRestricted === "boolean"
                ? record.isRestricted
                : accessStatus === "RESTRICTED",
        isAllowed:
            typeof record.isAllowed === "boolean" ? record.isAllowed : accessStatus === "ALLOWED",
        allowedCountries: normalizeCountryPolicyItems(record.allowedCountries),
        restrictedCountries: normalizeCountryPolicyItems(record.restrictedCountries),
    };
};

export const restrictedCountrySetFromPolicy = (policy?: Pick<CountryAccessPolicy, "restrictedCountries"> | null) =>
    new Set((policy?.restrictedCountries ?? []).map((country) => country.code));

export const allowedCountrySetFromPolicy = (policy?: Pick<CountryAccessPolicy, "allowedCountries"> | null) =>
    new Set((policy?.allowedCountries ?? []).map((country) => country.code));

export const isRestrictedCountryCode = (
    code?: string | null,
    policy?: Pick<CountryAccessPolicy, "restrictedCountries"> | null
): boolean => {
    const normalized = normalizeCountryCode(code);
    if (!normalized) return false;
    return restrictedCountrySetFromPolicy(policy).has(normalized);
};
