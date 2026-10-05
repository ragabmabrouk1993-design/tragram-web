import { readAnalyticsRuntimeConfig } from "./config";

describe("readAnalyticsRuntimeConfig", () => {
  const validEnvironment = {
    MIXPANEL_ENVIRONMENT: "staging",
    MIXPANEL_ENABLED: "true",
    MIXPANEL_PROJECT_ID: "4068283",
    MIXPANEL_TOKEN: "a".repeat(32),
    MIXPANEL_API_HOST: "https://api.mixpanel.com/",
    MIXPANEL_CONFIG_REVISION: "web-v1",
    ANALYTICS_CONSENT_POLICY_VERSION: "web-v1",
  };

  it("returns a complete enabled Staging target with a normalized regional host", () => {
    expect(readAnalyticsRuntimeConfig(validEnvironment)).toEqual({
      schemaVersion: 1,
      revision: "web-v1",
      environment: "staging",
      enabled: true,
      projectId: "4068283",
      token: "a".repeat(32),
      apiHost: "https://api.mixpanel.com",
      consentPolicyVersion: "web-v1",
      identityMode: "simplified",
    });
  });

  it("fails closed when an enabled target is incomplete or malformed", () => {
    const withoutToken = Object.fromEntries(
      Object.entries(validEnvironment).filter(([key]) => key !== "MIXPANEL_TOKEN"),
    );
    const invalidHost = { ...validEnvironment, MIXPANEL_API_HOST: "https://attacker.example" };
    const invalidProject = { ...validEnvironment, MIXPANEL_PROJECT_ID: "4068283?" };

    expect(readAnalyticsRuntimeConfig(withoutToken).enabled).toBe(false);
    expect(readAnalyticsRuntimeConfig(invalidHost).enabled).toBe(false);
    expect(readAnalyticsRuntimeConfig(invalidProject).enabled).toBe(false);
  });

  it("keeps analytics disabled when environment is absent or unrecognized", () => {
    expect(readAnalyticsRuntimeConfig({}).environment).toBe("local");
    expect(readAnalyticsRuntimeConfig({}).enabled).toBe(false);
    expect(readAnalyticsRuntimeConfig({
      ...validEnvironment,
      MIXPANEL_ENVIRONMENT: "preview",
    }).enabled).toBe(false);
  });
});
