import { NextResponse } from "next/server";
import { readAnalyticsRuntimeConfig } from "@/lib/analytics/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const config = readAnalyticsRuntimeConfig(process.env);
  const allowedOrigins = process.env.MIXPANEL_ALLOWED_WEB_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];
  const requestOrigin = new URL(request.url).origin;
  const enabled = config.enabled && allowedOrigins.includes(requestOrigin);

  return NextResponse.json(
    {
      ...config,
      enabled,
      projectId: enabled ? config.projectId : null,
      token: enabled ? config.token : null,
      apiHost: enabled ? config.apiHost : null,
      allowedOrigins: enabled ? [requestOrigin] : [],
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        Pragma: "no-cache",
        Vary: "Origin",
      },
    },
  );
}
