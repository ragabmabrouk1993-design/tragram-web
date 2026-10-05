import { headers } from "next/headers";
import type { CountryCode } from "libphonenumber-js";
import { getDetectedCountryServer } from "@/lib/country-detection-server";
import DashboardPageClient from "./dashboard-page-client";

const DEFAULT_COUNTRY = "US" as CountryCode;

export default async function DashboardPage() {
  const detectedCountry = await getDetectedCountryServer(await headers());
  return <DashboardPageClient defaultCountry={detectedCountry ?? DEFAULT_COUNTRY} />;
}
