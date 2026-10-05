import { headers } from "next/headers";
import type { CountryCode } from "libphonenumber-js";
import { getCountryAccessServer } from "@/lib/country-detection-server";
import { SignupClient } from "./signup-client";

const DEFAULT_COUNTRY = "US" as CountryCode;

export default async function SignupPage() {
    const countryAccess = await getCountryAccessServer(await headers());
    return (
        <SignupClient
            defaultCountry={countryAccess.countryCode ?? DEFAULT_COUNTRY}
            countryPolicy={countryAccess}
        />
    );
}
