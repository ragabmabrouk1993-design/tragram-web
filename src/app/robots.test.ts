import robots from "./robots";

describe("robots metadata route", () => {
  const originalRobotsDisallowAll = process.env.ROBOTS_DISALLOW_ALL;
  const originalRobotsHost = process.env.ROBOTS_HOST;

  afterEach(() => {
    if (originalRobotsDisallowAll === undefined) {
      delete process.env.ROBOTS_DISALLOW_ALL;
    } else {
      process.env.ROBOTS_DISALLOW_ALL = originalRobotsDisallowAll;
    }

    if (originalRobotsHost === undefined) {
      delete process.env.ROBOTS_HOST;
    } else {
      process.env.ROBOTS_HOST = originalRobotsHost;
    }
  });

  test("blocks all crawlers when staging robots flag is enabled", () => {
    process.env.ROBOTS_DISALLOW_ALL = "true";
    process.env.ROBOTS_HOST = "https://staging.tragram.app";

    expect(robots()).toMatchObject({
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      host: "https://staging.tragram.app",
    });
  });

  test("allows public pages and blocks private app paths by default", () => {
    delete process.env.ROBOTS_DISALLOW_ALL;
    delete process.env.ROBOTS_HOST;

    const result = robots();

    expect(result.rules).toMatchObject({
      userAgent: "*",
      allow: "/",
    });
    expect(result.sitemap).toContain("/sitemap.xml");
  });
});
