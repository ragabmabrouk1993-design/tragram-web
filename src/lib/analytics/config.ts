export type AnalyticsRuntimeConfig = {
  schemaVersion: 1;
  revision: string;
  environment: "local" | "staging" | "production";
  enabled: boolean;
  projectId: string | null;
  token: string | null;
  apiHost: string | null;
  consentPolicyVersion: string;
  identityMode: "simplified";
};

const ALLOWED_API_HOSTS = new Set([
  "https://api.mixpanel.com",
  "https://api-eu.mixpanel.com",
  "https://api-in.mixpanel.com",
]);

export function readAnalyticsRuntimeConfig(env: Record<string, string | undefined>): AnalyticsRuntimeConfig {
  const environmentValue = env.MIXPANEL_ENVIRONMENT?.trim();
  const validEnvironment = !environmentValue || ["local", "staging", "production"].includes(environmentValue);
  const environment = environmentValue === "staging" || environmentValue === "production"
    ? environmentValue
    : "local";
  const enabled = validEnvironment && env.MIXPANEL_ENABLED?.trim().toLowerCase() === "true";
  const rawApiHost = env.MIXPANEL_API_HOST?.trim().replace(/\/$/, "") ?? "";
  const projectId = env.MIXPANEL_PROJECT_ID?.trim() ?? "";
  const token = env.MIXPANEL_TOKEN?.trim() ?? "";
  const apiHost = ALLOWED_API_HOSTS.has(rawApiHost) ? rawApiHost : null;
  const validProjectId = /^\d+$/.test(projectId) ? projectId : null;
  const validToken = /^[a-f\d]{32}$/i.test(token) ? token : null;
  const policyVersion = env.ANALYTICS_CONSENT_POLICY_VERSION?.trim() ?? "";
  const revision = env.MIXPANEL_CONFIG_REVISION?.trim() || "unconfigured";

  return {
    schemaVersion: 1,
    revision,
    environment,
    enabled: enabled && Boolean(validProjectId && validToken && apiHost && policyVersion),
    projectId: validProjectId,
    token: validToken,
    apiHost,
    consentPolicyVersion: policyVersion || "unconfigured",
    identityMode: "simplified",
  };
}
