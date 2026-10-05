const normalizeEnvValue = (value: string | undefined | null): string => value?.trim().toLowerCase() ?? "";
const truthyEnvValues = new Set(["1", "true", "yes", "on"]);

export type CommercialMode = "STANDARD_BILLING" | "FREE_BASIC";

const normalizeCommercialMode = (
  value: string | undefined | null
): CommercialMode =>
  value?.trim().toUpperCase() === "FREE_BASIC"
    ? "FREE_BASIC"
    : "STANDARD_BILLING";

const isLocalOrStagingLabel = (value: string | undefined | null): boolean => {
  const normalized = normalizeEnvValue(value);
  return (
    normalized === "local" ||
    normalized === "development" ||
    normalized === "staging"
  );
};

const isLocalLabel = (value: string | undefined | null): boolean => {
  const normalized = normalizeEnvValue(value);
  return normalized === "local" || normalized === "development";
};

const hostLooksLocalOrStaging = (hostOrUrl: string | undefined | null): boolean => {
  const raw = hostOrUrl?.trim();
  if (!raw) return false;

  try {
    const parsed = raw.includes("://") ? new URL(raw) : new URL(`https://${raw}`);
    const host = parsed.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host.includes("staging");
  } catch {
    const lower = raw.toLowerCase();
    return lower.includes("localhost") || lower.includes("127.0.0.1") || lower.includes("staging");
  }
};

const hostLooksLocal = (hostOrUrl: string | undefined | null): boolean => {
  const raw = hostOrUrl?.trim();
  if (!raw) return false;

  try {
    const parsed = raw.includes("://") ? new URL(raw) : new URL(`https://${raw}`);
    const host = parsed.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    const lower = raw.toLowerCase();
    return lower.includes("localhost") || lower.includes("127.0.0.1");
  }
};

export const isLocalOrStagingServerEnv = (): boolean => {
  if (isLocalOrStagingLabel(process.env.NEXT_PUBLIC_ENVIRONMENT)) return true;
  if (isLocalOrStagingLabel(process.env.ENVIRONMENT)) return true;
  if (isLocalOrStagingLabel(process.env.APP_ENV)) return true;
  if (isLocalOrStagingLabel(process.env.NODE_ENV)) return true;
  if (hostLooksLocalOrStaging(process.env.NEXT_PUBLIC_API_URL)) return true;
  return false;
};

export const isLocalServerEnv = (): boolean => {
  if (isLocalLabel(process.env.NEXT_PUBLIC_ENVIRONMENT)) return true;
  if (isLocalLabel(process.env.ENVIRONMENT)) return true;
  if (isLocalLabel(process.env.APP_ENV)) return true;
  if (isLocalLabel(process.env.NODE_ENV)) return true;
  return false;
};

export const isVisualParityModeServerEnv = (): boolean => {
  const candidateValues = [
    process.env.NEXT_PUBLIC_VISUAL_PARITY_MODE,
    process.env.VISUAL_PARITY_MODE,
  ];

  return candidateValues.some((value) => truthyEnvValues.has(normalizeEnvValue(value)));
};

export const isLocalOrStagingClientEnv = (): boolean => {
  if (isLocalOrStagingServerEnv()) return true;

  if (typeof document !== "undefined") {
    const runtimeMeta = document.querySelector('meta[name="tragram-runtime-env"]');
    const runtimeEnv = runtimeMeta?.getAttribute("content");
    if (isLocalOrStagingLabel(runtimeEnv)) return true;

    const apiMeta = document.querySelector('meta[name="tragram-api-url"]');
    const apiBaseUrl = apiMeta?.getAttribute("content");
    if (hostLooksLocalOrStaging(apiBaseUrl)) return true;
  }

  if (typeof window !== "undefined") {
    if (hostLooksLocalOrStaging(window.location.hostname)) return true;
    if (hostLooksLocalOrStaging(window.location.origin)) return true;
  }

  return false;
};

export const isLocalClientEnv = (): boolean => {
  if (isLocalServerEnv()) return true;

  if (typeof document !== "undefined") {
    const runtimeMeta = document.querySelector('meta[name="tragram-runtime-env"]');
    const runtimeEnv = runtimeMeta?.getAttribute("content");
    if (isLocalLabel(runtimeEnv)) return true;

    const apiMeta = document.querySelector('meta[name="tragram-api-url"]');
    const apiBaseUrl = apiMeta?.getAttribute("content");
    if (hostLooksLocal(apiBaseUrl)) return true;
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname?.toLowerCase() ?? "";
    const origin = window.location.origin?.toLowerCase() ?? "";
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      origin.includes("localhost") ||
      origin.includes("127.0.0.1")
    ) {
      return true;
    }
  }

  return false;
};

export const isVisualParityModeClientEnv = (): boolean => {
  if (isVisualParityModeServerEnv()) return true;

  if (typeof document !== "undefined") {
    const runtimeMeta = document.querySelector('meta[name="tragram-visual-parity-mode"]');
    const enabled = runtimeMeta?.getAttribute("content");
    if (truthyEnvValues.has(normalizeEnvValue(enabled))) return true;
  }

  return false;
};

export const resolveCommercialModeServerEnv = (): CommercialMode =>
  normalizeCommercialMode(
    process.env.COMMERCIAL_MODE ?? process.env.NEXT_PUBLIC_COMMERCIAL_MODE
  );

export const resolveCommercialModeClientEnv = (): CommercialMode => {
  if (typeof document !== "undefined") {
    const runtimeMeta = document.querySelector(
      'meta[name="tragram-commercial-mode"]'
    );
    if (runtimeMeta) {
      return normalizeCommercialMode(runtimeMeta.getAttribute("content"));
    }
  }

  return resolveCommercialModeServerEnv();
};

export const isBillingDisabledInServerEnv = (): boolean =>
  resolveCommercialModeServerEnv() === "FREE_BASIC" ||
  (isLocalServerEnv() && !isVisualParityModeServerEnv());

export const isBillingDisabledInCurrentEnv = (): boolean =>
  resolveCommercialModeClientEnv() === "FREE_BASIC" ||
  (isLocalClientEnv() && !isVisualParityModeClientEnv());
