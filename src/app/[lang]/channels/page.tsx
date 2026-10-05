import { headers } from "next/headers";
import type { CountryCode } from "libphonenumber-js";
import { getDetectedCountryServer } from "@/lib/country-detection-server";
import ChannelsPageClient from "./channels-page-client";

const DEFAULT_COUNTRY = "US" as CountryCode;

export default async function ChannelsPage() {
  const detectedCountry = await getDetectedCountryServer(await headers());
  return <ChannelsPageClient defaultCountry={detectedCountry ?? DEFAULT_COUNTRY} />;
}
