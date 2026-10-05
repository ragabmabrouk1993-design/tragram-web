export {};

const getApiAuthCountryMock = jest.fn();

jest.mock("@/lib/api-client", () => ({
  getApiAuthCountry: getApiAuthCountryMock,
}));

describe("country detection server API client", () => {
  const originalPublicApiUrl = process.env.PUBLIC_API_URL;
  const originalNextPublicApiUrl = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    jest.resetModules();
    getApiAuthCountryMock.mockReset();
    process.env.PUBLIC_API_URL = "https://api.example.test/api";
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  afterAll(() => {
    if (originalPublicApiUrl === undefined) delete process.env.PUBLIC_API_URL;
    else process.env.PUBLIC_API_URL = originalPublicApiUrl;
    if (originalNextPublicApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = originalNextPublicApiUrl;
  });

  test("calls the generated operation with per-request server options", async () => {
    getApiAuthCountryMock.mockResolvedValue({
      data: {
        countryCode: "us",
        countryName: " United States of America (the) ",
        source: "HEADER",
        accessStatus: "ALLOWED",
        isRestricted: false,
        isAllowed: true,
        allowedCountries: [{ code: "us", name: " United States " }],
        restrictedCountries: [{ code: "ir", name: " Iran " }],
      },
    });
    const requestHeaders = new Headers({
      "x-client-ip": "8.8.8.8",
      "x-forwarded-country": "US",
      "accept-language": "en-US,en;q=0.9",
    });

    const { getCountryAccessServer } = await import("./country-detection-server");
    const result = await getCountryAccessServer(requestHeaders);

    expect(getApiAuthCountryMock).toHaveBeenCalledWith({
      baseURL: "https://api.example.test",
      headers: expect.objectContaining({
        "x-client-ip": "8.8.8.8",
        "x-forwarded-for": "8.8.8.8",
        "x-forwarded-country": "US",
      }),
      throwOnError: true,
      timeout: 5_000,
    });
    expect(result).toMatchObject({
      countryCode: "US",
      isAllowed: true,
      allowedCountries: [{ code: "US", name: "United States" }],
      restrictedCountries: [{ code: "IR", name: "Iran" }],
    });
  });

  test("returns normalized fail-closed policy when the request fails", async () => {
    getApiAuthCountryMock.mockRejectedValue(new Error("unavailable"));

    const { getCountryAccessServer } = await import("./country-detection-server");
    const result = await getCountryAccessServer(new Headers());

    expect(result).toMatchObject({
      countryCode: null,
      accessStatus: "UNKNOWN",
      isAllowed: false,
      allowedCountries: [],
      restrictedCountries: [],
    });
  });
});
