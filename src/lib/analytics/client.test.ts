import type { AnalyticsRuntimeConfig } from "./config";

const mockMixpanel = {
  init: jest.fn(),
  opt_in_tracking: jest.fn(),
  opt_out_tracking: jest.fn(),
  identify: jest.fn(),
  reset: jest.fn(),
  track: jest.fn(),
  get_distinct_id: jest.fn(() => "anonymous-id"),
};

jest.mock("mixpanel-browser", () => ({ __esModule: true, default: mockMixpanel }));

const enabledConfig: AnalyticsRuntimeConfig = {
  schemaVersion: 1,
  revision: "web-v1",
  environment: "staging",
  enabled: true,
  projectId: "4068283",
  token: "a".repeat(32),
  apiHost: "https://api.mixpanel.com",
  consentPolicyVersion: "web-v1",
  identityMode: "simplified",
};

describe("Mixpanel browser client", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location: { protocol: "https:", reload: jest.fn() } },
    });
  });

  afterAll(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("does not initialize or send before explicit consent", async () => {
    const client = await import("./client");
    client.trackAnalyticsEvent("screen_viewed", { screen_name: "faqs" });

    expect(mockMixpanel.init).not.toHaveBeenCalled();
    expect(mockMixpanel.track).not.toHaveBeenCalled();
  });

  it("initializes once with automatic collection disabled and sends mapped events after consent", async () => {
    expect(typeof window).toBe("object");
    expect(enabledConfig.enabled).toBe(true);
    const sdk = await import("mixpanel-browser");
    expect(sdk.default).toBe(mockMixpanel);
    const client = await import("./client");
    const initialized = await Promise.all([
      client.enableAnalytics(enabledConfig, null),
      client.enableAnalytics(enabledConfig, null),
    ]);

    expect(initialized).toEqual([true, true]);
    expect(mockMixpanel.init).toHaveBeenCalledTimes(1);
    const [, options] = mockMixpanel.init.mock.calls[0] as [string, Record<string, unknown>];
    expect(options).toMatchObject({
      autocapture: false,
      track_pageview: false,
      record_sessions_percent: 0,
      record_heatmap_data: false,
      api_host: "https://api.mixpanel.com",
      persistence_name: "tragram_staging_4068283",
    });

    client.trackAnalyticsEvent("screen_viewed", { screen_name: "faqs" });
    expect(mockMixpanel.track).toHaveBeenCalledWith("screen_viewed", { screen_name: "faqs" });
  });

  it("clears pending sends and opts out when consent is withdrawn", async () => {
    const client = await import("./client");
    await client.enableAnalytics(enabledConfig, null);
    client.trackAnalyticsEvent("screen_viewed", { screen_name: "faqs" });
    client.disableAnalytics();
    client.trackAnalyticsEvent("screen_viewed", { screen_name: "dashboard" });

    expect(mockMixpanel.track).toHaveBeenCalledTimes(1);
    expect(mockMixpanel.opt_out_tracking).toHaveBeenCalledWith({ delete_user: false, clear_persistence: true });
  });

  it("attributes authenticated actions to the backend user ID and resets on identity removal", async () => {
    let distinctId = "anonymous-id";
    mockMixpanel.get_distinct_id.mockImplementation(() => distinctId);
    mockMixpanel.identify.mockImplementation((id: string) => { distinctId = id; });
    mockMixpanel.reset.mockImplementation(() => { distinctId = "anonymous-id"; });
    const client = await import("./client");
    await client.enableAnalytics(enabledConfig, "user-123");
    client.trackAnalyticsEvent("login_completed", { method: "password" });
    client.updateAnalyticsIdentity(null);

    expect(mockMixpanel.identify).toHaveBeenCalledWith("user-123");
    expect(mockMixpanel.track).toHaveBeenCalledWith("login_completed", { method: "password" });
    expect(mockMixpanel.reset).toHaveBeenCalled();
  });
});
