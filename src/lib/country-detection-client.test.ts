export {};

const getApiAuthCountryMock = jest.fn();
const initApiClientMock = jest.fn();

jest.mock("@/lib/api-client", () => ({
    getApiAuthCountry: getApiAuthCountryMock,
}));

jest.mock("@/lib/api-client-setup", () => ({
    initApiClient: initApiClientMock,
}));

const createSessionStorage = () => {
    const store = new Map<string, string>();
    return {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
            store.set(key, value);
        },
        removeItem: (key: string) => {
            store.delete(key);
        },
        clear: () => {
            store.clear();
        },
    };
};

describe("country detection client cache", () => {
    beforeEach(() => {
        jest.resetModules();
        getApiAuthCountryMock.mockReset();
        initApiClientMock.mockReset();
        Object.defineProperty(globalThis, "window", {
            configurable: true,
            writable: true,
            value: {
                sessionStorage: createSessionStorage(),
            } as unknown as Window & typeof globalThis,
        });
    });

    test("fetches detected country once and reuses memory cache", async () => {
        getApiAuthCountryMock.mockResolvedValue({
            data: { countryCode: "us" },
        });

        const { getDetectedCountryClient } = await import("./country-detection-client");
        const first = await getDetectedCountryClient();
        const second = await getDetectedCountryClient();

        expect(first).toBe("US");
        expect(second).toBe("US");
        expect(getApiAuthCountryMock).toHaveBeenCalledTimes(1);
        expect(initApiClientMock).toHaveBeenCalledTimes(1);
    });

    test("uses session cache when available and skips API request", async () => {
        window.sessionStorage.setItem(
            "tragram.countryAccess",
            JSON.stringify({ countryCode: "CA" })
        );

        const { getDetectedCountryClient } = await import("./country-detection-client");
        const result = await getDetectedCountryClient();

        expect(result).toBe("CA");
        expect(getApiAuthCountryMock).not.toHaveBeenCalled();
    });

    test("ignores invalid cached country values such as language-only EN", async () => {
        window.sessionStorage.setItem(
            "tragram.countryAccess",
            JSON.stringify({ countryCode: "EN" })
        );
        getApiAuthCountryMock.mockResolvedValue({
            data: { countryCode: "US" },
        });

        const { getDetectedCountryClient } = await import("./country-detection-client");
        const result = await getDetectedCountryClient();

        expect(result).toBe("US");
        expect(getApiAuthCountryMock).toHaveBeenCalledTimes(1);
    });

    test("does not cache null responses and retries on next call", async () => {
        getApiAuthCountryMock
            .mockResolvedValueOnce({ data: { countryCode: null } })
            .mockResolvedValueOnce({ data: { countryCode: "TR" } });

        const { getDetectedCountryClient } = await import("./country-detection-client");
        const first = await getDetectedCountryClient();
        const second = await getDetectedCountryClient();

        expect(first).toBeNull();
        expect(second).toBe("TR");
        expect(getApiAuthCountryMock).toHaveBeenCalledTimes(2);
    });

    test("normalizes policy lists returned by the generated country operation", async () => {
        getApiAuthCountryMock.mockResolvedValue({
            data: {
                countryCode: "tr",
                accessStatus: "ALLOWED",
                isAllowed: true,
                allowedCountries: [
                    { code: "tr", name: " Türkiye " },
                    { code: "us", name: " United States " },
                ],
                restrictedCountries: [{ code: "ir", name: " Iran " }],
            },
        });

        const { getCountryPolicyListsClient } = await import("./country-detection-client");

        await expect(getCountryPolicyListsClient()).resolves.toEqual({
            allowedCountries: [
                { code: "TR", name: "Türkiye" },
                { code: "US", name: "United States" },
            ],
            restrictedCountries: [{ code: "IR", name: "Iran" }],
        });
        expect(getApiAuthCountryMock).toHaveBeenCalledTimes(1);
        expect(initApiClientMock).toHaveBeenCalledTimes(1);
    });
});
