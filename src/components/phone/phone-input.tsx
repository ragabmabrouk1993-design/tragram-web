"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Phone } from "lucide-react";
import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";
import { CountrySelect } from "@/components/phone/country-select";
import type { CountryAccessPolicy } from "@/lib/restricted-countries";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { cn } from "@/lib/utils";
import { formatNationalNumber, parsePhoneValue } from "@/lib/phone";

interface PhoneInputProps {
    value: string;
    onChange: (value: string) => void;
    defaultCountry?: CountryCode;
    policy?: Pick<CountryAccessPolicy, "allowedCountries" | "restrictedCountries"> | null;
    disabled?: boolean;
    error?: string;
    placeholder?: string;
    className?: string;
    name?: string;
    ariaLabel?: string;
    tone?: "dark";
}

const supportedCountries = new Set<CountryCode>(getCountries());

const normalizeSupportedCountry = (value?: string | null): CountryCode => {
    if (!value) return "US";
    const normalized = value.trim().toUpperCase() as CountryCode;
    return supportedCountries.has(normalized) ? normalized : "US";
};

export const shouldApplyAsyncDefaultCountry = (params: {
    currentValue: string;
    currentDigits: string;
    userInteracted: boolean;
}) => {
    return !params.userInteracted && !params.currentValue && !params.currentDigits;
};

export const shouldWaitForExternalPhoneValue = (params: {
    currentValue: string;
    currentDigits: string;
    userInteracted: boolean;
}) => Boolean(params.currentValue) && !params.currentDigits && !params.userInteracted;

export function PhoneInput({
    value,
    onChange,
    defaultCountry = "US",
    policy,
    disabled,
    error,
    placeholder,
    className,
    name,
    ariaLabel,
}: PhoneInputProps) {
    const intlMessages = useRouteMessages();
    const resolvedPlaceholder = placeholder ?? intlMessages.commonPhone.phonePlaceholder;
    const [country, setCountry] = useState<CountryCode>(normalizeSupportedCountry(defaultCountry));
    const [digits, setDigits] = useState("");
    const [userInteracted, setUserInteracted] = useState(false);
    const onChangeRef = useRef(onChange);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        let active = true;
        if (!value) {
            Promise.resolve().then(() => {
                if (active) {
                    setDigits("");
                }
            });
        } else {
            const parsed = parsePhoneValue(value);
            Promise.resolve().then(() => {
                if (!active) return;
                setDigits(parsed.nationalNumber);
                if (parsed.country) {
                    setCountry(normalizeSupportedCountry(parsed.country));
                }
            });
        }
        return () => {
            active = false;
        };
    }, [value]);

    const normalizedCountry = normalizeSupportedCountry(country);
    const shouldUseDefaultCountry = shouldApplyAsyncDefaultCountry({
        currentValue: value,
        currentDigits: digits,
        userInteracted,
    });
    const activeCountry = shouldUseDefaultCountry
        ? normalizeSupportedCountry(defaultCountry)
        : normalizedCountry;

    const formattedValue = useMemo(
        () => (digits ? formatNationalNumber(activeCountry, digits) : ""),
        [activeCountry, digits]
    );

    useEffect(() => {
        if (
            shouldWaitForExternalPhoneValue({
                currentValue: value,
                currentDigits: digits,
                userInteracted,
            })
        ) {
            return;
        }
        const callingCode = getCountryCallingCode(activeCountry);
        let normalizedDigits = digits;
        const codePrefix = callingCode;
        if (normalizedDigits.startsWith(codePrefix)) {
            normalizedDigits = normalizedDigits.slice(codePrefix.length);
        }
        if (normalizedDigits.startsWith("0")) {
            normalizedDigits = normalizedDigits.replace(/^0+/, "");
        }
        const nextValue = normalizedDigits ? `+${callingCode}${normalizedDigits}` : "";
        if (nextValue !== value) {
            onChangeRef.current(nextValue);
        }
    }, [activeCountry, digits, userInteracted, value]);

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex items-center gap-3">
                <CountrySelect
                    value={activeCountry}
                    onChange={(nextCountry) => {
                        setUserInteracted(true);
                        setCountry(nextCountry);
                    }}
                    policy={policy}
                    disabled={disabled}
                />
                <div
                    className={cn(
                        "auth-round flex h-12 flex-1 items-center gap-3 rounded-full border border-[var(--input-border)] bg-[var(--input-bg)] px-4",
                        disabled && "cursor-not-allowed opacity-60",
                        error && "auth-flow-field-error border-red-400/90"
                    )}
                >
                    <Phone className="h-4 w-4 text-[var(--input-placeholder)]" />
                    <input
                        type="tel"
                        value={formattedValue}
                        name={name}
                        aria-label={ariaLabel}
                        onChange={(event) =>
                            {
                                setUserInteracted(true);
                                setDigits(event.target.value.replace(/\D/g, ""));
                            }
                        }
                        placeholder={resolvedPlaceholder}
                        disabled={disabled}
                        aria-invalid={Boolean(error)}
                        className="w-full bg-transparent text-sm text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] text-start focus:outline-none disabled:cursor-not-allowed"
                    />
                </div>
            </div>
            {error && <p className="text-xs text-[var(--error-color)]">{error}</p>}
        </div>
    );
}
