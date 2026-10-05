import {
  isNonIndexableHostname,
  normalizeRequestHostname,
  stagingRobotsBody,
  stagingRobotsHeaderValue,
} from "./search-indexing";

describe("search indexing policy", () => {
  test.each([
    ["staging.tragram.app", "staging.tragram.app"],
    ["staging.tragram.app:443", "staging.tragram.app"],
    ["staging.tragram.app, proxy.internal", "staging.tragram.app"],
    [" STAGING.TRAGRAM.APP:8443 ", "staging.tragram.app"],
  ])("normalizes %s", (value, expected) => {
    expect(normalizeRequestHostname(value)).toBe(expected);
  });

  test("blocks only the staging hostname", () => {
    expect(isNonIndexableHostname("staging.tragram.app")).toBe(true);
    expect(isNonIndexableHostname("staging.tragram.app:443")).toBe(true);
    expect(isNonIndexableHostname("tragram.app")).toBe(false);
    expect(isNonIndexableHostname("api.staging.tragram.app")).toBe(false);
    expect(isNonIndexableHostname(null)).toBe(false);
  });

  test("staging robots policy blocks all crawlers without advertising a sitemap", () => {
    expect(stagingRobotsBody).toBe("User-agent: *\nDisallow: /\n");
    expect(stagingRobotsBody).not.toContain("Sitemap:");
  });

  test("staging response header blocks indexing, following, and archiving", () => {
    expect(stagingRobotsHeaderValue).toBe("noindex, nofollow, noarchive");
  });
});
