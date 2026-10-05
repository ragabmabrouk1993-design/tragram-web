"use client";

import { getApiAuthCountry } from "@/lib/api-client";
import { initApiClient } from "@/lib/api-client-setup";
import {
    normalizeCountryAccessPolicy,
    type CountryAccessPolicy,
    type CountryPolicyItem,
} from "@/lib/restricted-countries";

const COUNTRY_ACCESS_SESSION_KEY = "tragram.countryAccess";

let inFlightCountryRequest: Promise<CountryAccessPolicy> | null = null;
let memoryCachedPolicy: CountryAccessPolicy | undefined;

const isCacheableCountryAccessPolicy = (policy: CountryAccessPolicy): boolean => {
    return (
        Boolean(policy.countryCode) ||
        policy.accessStatus !== "UNKNOWN" ||
        policy.allowedCountries.length > 0 ||
        policy.restrictedCountries.length > 0
    );
};

const readCountryAccessFromSessionStorage = (): CountryAccessPolicy | undefined => {
    if (typeof window === "undefined") return undefined;
    const raw = window.sessionStorage.getItem(COUNTRY_ACCESS_SESSION_KEY);
    if (raw === null) return undefined;
    try {
        const policy = normalizeCountryAccessPolicy(JSON.parse(raw));
        if (!isCacheableCountryAccessPolicy(policy)) {
            window.sessionStorage.removeItem(COUNTRY_ACCESS_SESSION_KEY);
            return undefined;
        }
        return policy;
    } catch {
        window.sessionStorage.removeItem(COUNTRY_ACCESS_SESSION_KEY);
        return undefined;
    }
};

const writeCountryAccessToSessionStorage = (policy: CountryAccessPolicy) => {
    if (typeof window === "undefined") return;
    if (!isCacheableCountryAccessPolicy(policy)) return;
    window.sessionStorage.setItem(COUNTRY_ACCESS_SESSION_KEY, JSON.stringify(policy));
};

const fetchDetectedCountryAccess = async (): Promise<CountryAccessPolicy> => {
    initApiClient();
    try {
        const response = await getApiAuthCountry({
            throwOnError: true,
        });
        return normalizeCountryAccessPolicy(response.data);
    } catch {
        return normalizeCountryAccessPolicy(null);
    }
};

export const getCountryAccessClient = async (): Promise<CountryAccessPolicy> => {
    if (typeof window === "undefined") return normalizeCountryAccessPolicy(null);

    if (memoryCachedPolicy !== undefined) {
        return memoryCachedPolicy;
    }

    const fromSessionStorage = readCountryAccessFromSessionStorage();
    if (fromSessionStorage !== undefined) {
        memoryCachedPolicy = fromSessionStorage;
        return fromSessionStorage;
    }

    if (!inFlightCountryRequest) {
        inFlightCountryRequest = fetchDetectedCountryAccess()
            .then((policy) => {
                if (isCacheableCountryAccessPolicy(policy)) {
                    memoryCachedPolicy = policy;
                    writeCountryAccessToSessionStorage(policy);
                }
                return policy;
            })
            .finally(() => {
                inFlightCountryRequest = null;
            });
    }

    return inFlightCountryRequest;
};

export const getDetectedCountryClient = async () => {
    const policy = await getCountryAccessClient();
    return policy.countryCode;
};

export const getCountryPolicyListsClient = async (): Promise<{
    allowedCountries: CountryPolicyItem[];
    restrictedCountries: CountryPolicyItem[];
}> => {
    const policy = await getCountryAccessClient();
    return {
        allowedCountries: policy.allowedCountries,
        restrictedCountries: policy.restrictedCountries,
    };
};

export const countryDetectionClientInternals = {
    readCountryAccessFromSessionStorage,
    writeCountryAccessToSessionStorage,
    isCacheableCountryAccessPolicy,
};
