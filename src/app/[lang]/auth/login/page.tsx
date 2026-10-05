import { headers } from "next/headers";
import type { CountryCode } from "libphonenumber-js";
import { getCountryAccessServer } from "@/lib/country-detection-server";
import { LoginClient } from "./login-client";

const DEFAULT_COUNTRY = "US" as CountryCode;

export default async function LoginPage() {
    const countryAccess = await getCountryAccessServer(await headers());
    return (
        <LoginClient
            defaultCountry={countryAccess.countryCode ?? DEFAULT_COUNTRY}
            countryPolicy={countryAccess}
        />
    );
}
