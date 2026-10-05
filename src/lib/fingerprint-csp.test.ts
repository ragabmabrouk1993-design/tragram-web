import { buildFingerprintCspHeader } from "./fingerprint-csp";

describe("buildFingerprintCspHeader", () => {
  it("returns no policy when Fingerprint collection is disabled", () => {
    expect(
      buildFingerprintCspHeader({
        enabled: false,
        mode: "enforce",
        apiUrl: "https://api.tragram.app/api",
        endpoint: "https://metrics.tragram.app",
      })
    ).toBeNull();
  });

  it("builds a report-only policy with provider, API, and first-party origins", () => {
    const header = buildFingerprintCspHeader({
      enabled: true,
      mode: "report-only",
      apiUrl: "https://api.staging.tragram.app/api",
      endpoint: "https://metrics.staging.tragram.app",
    });

    expect(header?.key).toBe("Content-Security-Policy-Report-Only");
    expect(header?.value).toContain("default-src 'self'");
    expect(header?.value).toContain("https://fpnpmcdn.net");
    expect(header?.value).toContain("https://*.fpjs.io");
    expect(header?.value).toContain("https://api.staging.tragram.app");
    expect(header?.value).toContain("https://metrics.staging.tragram.app");
  });

  it("uses the enforcing header only when explicitly requested", () => {
    const header = buildFingerprintCspHeader({
      enabled: true,
      mode: "enforce",
    });

    expect(header?.key).toBe("Content-Security-Policy");
  });

  it("adds only an approved Mixpanel ingestion origin when runtime collection is enabled", () => {
    const header = buildFingerprintCspHeader({
      enabled: false,
      mode: "report-only",
      mixpanelEnabled: true,
      mixpanelApiHost: "https://api.mixpanel.com/",
    });

    expect(header?.value).toMatch(/connect-src[^;]*https:\/\/api\.mixpanel\.com/);
    expect(header?.value).not.toContain("https://api-eu.mixpanel.com");
  });

  it("does not allow Mixpanel requests when collection is disabled or the host is unapproved", () => {
    const disabled = buildFingerprintCspHeader({
      enabled: false,
      mode: "report-only",
      mixpanelEnabled: false,
      mixpanelApiHost: "https://api.mixpanel.com",
    });
    const unapproved = buildFingerprintCspHeader({
      enabled: false,
      mode: "report-only",
      mixpanelEnabled: true,
      mixpanelApiHost: "https://collector.example",
    });

    expect(disabled).toBeNull();
    expect(unapproved).toBeNull();
  });

  it("treats unknown modes as disabled", () => {
    expect(
      buildFingerprintCspHeader({
        enabled: true,
        mode: "unexpected",
      })
    ).toBeNull();
  });
});
