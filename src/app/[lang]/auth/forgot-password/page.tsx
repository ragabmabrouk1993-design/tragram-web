import { headers } from "next/headers";
import type { CountryCode } from "libphonenumber-js";
import { getCountryAccessServer } from "@/lib/country-detection-server";
import { ForgotPasswordClient } from "./forgot-password-client";

const DEFAULT_COUNTRY = "US" as CountryCode;

export default async function ForgotPasswordPage() {
    const countryAccess = await getCountryAccessServer(await headers());
    return (
        <ForgotPasswordClient
            defaultCountry={countryAccess.countryCode ?? DEFAULT_COUNTRY}
            countryPolicy={countryAccess}
        />
    );
}
