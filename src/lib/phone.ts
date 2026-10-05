import {
    AsYouType,
    getCountries,
    getCountryCallingCode,
    parsePhoneNumberFromString,
    CountryCode,
} from "libphonenumber-js";
import {
    allowedCountrySetFromPolicy,
    restrictedCountrySetFromPolicy,
    type CountryAccessPolicy,
} from "@/lib/restricted-countries";

export interface CountryOption {
    code: CountryCode;
    name: string;
    callingCode: string;
    flag: string;
    restricted?: boolean;
}

const regionNames =
    typeof Intl !== "undefined" && "DisplayNames" in Intl
        ? new Intl.DisplayNames(["en"], { type: "region" })
        : null;

const getFlagEmoji = (countryCode: string) => {
    const codePoints = countryCode
        .toUpperCase()
        .split("")
        .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
};

const sanitizePhoneNumberValue = (value: string) =>
    value.trim().replace(/[^\d+]/g, "");

export const buildCountryOptions = (
    policy?: Pick<CountryAccessPolicy, "allowedCountries" | "restrictedCountries"> | null
): CountryOption[] => {
    const restrictedCountries = restrictedCountrySetFromPolicy(policy);
    const allowedCountries = allowedCountrySetFromPolicy(policy);
    const allowlistEnabled = allowedCountries.size > 0;

    return getCountries()
        .filter((code) => !allowlistEnabled || allowedCountries.has(code))
        .map((code) => ({
            code,
            name: regionNames?.of(code) ?? code,
            callingCode: `+${getCountryCallingCode(code)}`,
            flag: getFlagEmoji(code),
            restricted: restrictedCountries.has(code),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
};

export const formatNationalNumber = (country: CountryCode, digits: string) => {
    const formatter = new AsYouType(country);
    return formatter.input(digits);
};

export const parsePhoneValue = (value: string) => {
    const normalized = sanitizePhoneNumberValue(value);
    const parsed = parsePhoneNumberFromString(normalized);
    if (!parsed) {
        return {
            country: null,
            nationalNumber: normalized.replace(/\D/g, ""),
        };
    }

    return {
        country: parsed.country ?? null,
        nationalNumber: parsed.nationalNumber ?? normalized.replace(/\D/g, ""),
    };
};

export const isValidPhoneNumber = (value: string) => {
    if (!value) return false;
    const normalized = sanitizePhoneNumberValue(value);
    const parsed = parsePhoneNumberFromString(normalized);
    const isValid = Boolean(parsed?.isValid());
    return isValid;
};

export const isRestrictedCountry = (
    countryCode?: CountryCode | null,
    policy?: Pick<CountryAccessPolicy, "restrictedCountries"> | null
) => Boolean(countryCode && restrictedCountrySetFromPolicy(policy).has(countryCode));

export const isAllowedPhoneNumber = (
    value: string,
    policy?: Pick<CountryAccessPolicy, "allowedCountries" | "restrictedCountries"> | null
) => {
    const normalized = sanitizePhoneNumberValue(value);
    const parsed = parsePhoneNumberFromString(normalized);
    if (!parsed?.country) return true;
    const restrictedCountries = restrictedCountrySetFromPolicy(policy);
    if (restrictedCountries.has(parsed.country)) {
        return false;
    }

    const allowedCountries = allowedCountrySetFromPolicy(policy);
    if (allowedCountries.size === 0) {
        return true;
    }

    return allowedCountries.has(parsed.country);
};
