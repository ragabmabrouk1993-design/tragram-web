import { detectCountryFromHeaders } from "./country-detection";

const buildHeaders = (source: Record<string, string | null | undefined>) => ({
    get: (key: string) => source[key.toLowerCase()] ?? null,
});

describe("detectCountryFromHeaders", () => {
    test("returns region country from accept-language when available", () => {
        const headers = buildHeaders({
            "accept-language": "en-US,en;q=0.9",
        }) as Headers;

        expect(detectCountryFromHeaders(headers)).toBe("US");
    });

    test("does not treat language-only accept-language as country", () => {
        const headers = buildHeaders({
            "accept-language": "en;q=0.9",
        }) as Headers;

        expect(detectCountryFromHeaders(headers)).toBeNull();
    });
});
