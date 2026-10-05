export type FingerprintCspMode = "off" | "report-only" | "enforce";

export type FingerprintCspConfig = {
  enabled: boolean;
  mode?: string;
  apiUrl?: string;
  endpoint?: string;
  mixpanelApiHost?: string;
  mixpanelEnabled?: boolean;
};

export type FingerprintCspHeader = {
  key: "Content-Security-Policy" | "Content-Security-Policy-Report-Only";
  value: string;
};

const originFor = (value?: string): string | undefined => {
  const normalized = value?.trim();
  if (!normalized) return undefined;

  try {
    return new URL(normalized).origin;
  } catch {
    return undefined;
  }
};

const unique = (values: Array<string | undefined>): string[] =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value))));

export const buildFingerprintCspHeader = ({
  enabled,
  mode,
  apiUrl,
  endpoint,
  mixpanelApiHost,
  mixpanelEnabled = false,
}: FingerprintCspConfig): FingerprintCspHeader | null => {
  if (mode !== "report-only" && mode !== "enforce") return null;
  const allowedMixpanelHosts = new Set([
    "https://api.mixpanel.com",
    "https://api-eu.mixpanel.com",
    "https://api-in.mixpanel.com",
  ]);
  const normalizedMixpanelHost = mixpanelApiHost?.trim().replace(/\/$/, "");
  const includeMixpanel = Boolean(mixpanelEnabled && normalizedMixpanelHost && allowedMixpanelHosts.has(normalizedMixpanelHost));
  if (!enabled && !includeMixpanel) return null;

  const firstPartyOrigins = unique([
    ...(enabled ? [originFor(apiUrl), originFor(endpoint)] : []),
    includeMixpanel ? originFor(normalizedMixpanelHost) : undefined,
  ]);
  const connectSources = unique([
    "'self'",
    ...(enabled ? ["https://fpnpmcdn.net", "https://*.fpjs.io"] : []),
    "https://client.crisp.chat",
    "https://*.crisp.chat",
    ...firstPartyOrigins,
  ]);

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    `script-src 'self' 'unsafe-inline' ${enabled ? "https://fpnpmcdn.net" : ""} https://client.crisp.chat`.replace(/\s+/g, " ").trim(),
    `connect-src ${connectSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "worker-src 'self' blob:",
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://*.crisp.chat",
  ];

  return {
    key:
      mode === "enforce"
        ? "Content-Security-Policy"
        : "Content-Security-Policy-Report-Only",
    value: directives.join("; "),
  };
};
