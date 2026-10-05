jest.mock("@/components/phone/country-select", () => ({
    CountrySelect: () => null,
}));

import { shouldApplyAsyncDefaultCountry, shouldWaitForExternalPhoneValue } from "./phone-input";

describe("phone input async default country behavior", () => {
    test("applies async default country when field is untouched and empty", () => {
        expect(
            shouldApplyAsyncDefaultCountry({
                currentValue: "",
                currentDigits: "",
                userInteracted: false,
            })
        ).toBe(true);
    });

    test("does not apply async default country once user has interacted", () => {
        expect(
            shouldApplyAsyncDefaultCountry({
                currentValue: "",
                currentDigits: "",
                userInteracted: true,
            })
        ).toBe(false);
    });

    test("does not apply async default country when there is already input value", () => {
        expect(
            shouldApplyAsyncDefaultCountry({
                currentValue: "+20100111222",
                currentDigits: "100111222",
                userInteracted: false,
            })
        ).toBe(false);
    });

    test("waits for an externally loaded number to be parsed before syncing it", () => {
        expect(
            shouldWaitForExternalPhoneValue({
                currentValue: "+905314996328",
                currentDigits: "",
                userInteracted: false,
            })
        ).toBe(true);
        expect(
            shouldWaitForExternalPhoneValue({
                currentValue: "+905314996328",
                currentDigits: "5314996328",
                userInteracted: false,
            })
        ).toBe(false);
    });

    test("does not wait for external parsing after the user has interacted", () => {
        expect(
            shouldWaitForExternalPhoneValue({
                currentValue: "+905314996328",
                currentDigits: "",
                userInteracted: true,
            })
        ).toBe(false);
    });
});
