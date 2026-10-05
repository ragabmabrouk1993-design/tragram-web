import { shouldShowCrispLauncher } from "./crisp-chat-route";

describe("shouldShowCrispLauncher", () => {
    test("hides the mobile launcher on every auth flow so it cannot cover a form action", () => {
        expect(shouldShowCrispLauncher("/en/auth/login")).toBe(false);
        expect(shouldShowCrispLauncher("/en/auth/signup")).toBe(false);
        expect(shouldShowCrispLauncher("/en/auth/forgot-password")).toBe(false);
        expect(shouldShowCrispLauncher("/en/dashboard")).toBe(true);
    });

    test("hides the mobile launcher on the account deletion flow so it cannot cover form fields", () => {
        expect(shouldShowCrispLauncher("/en/account-deletion")).toBe(false);
        expect(shouldShowCrispLauncher("/ar/account-deletion")).toBe(false);
        expect(shouldShowCrispLauncher("/en/account-deletion/")).toBe(false);
    });
});
