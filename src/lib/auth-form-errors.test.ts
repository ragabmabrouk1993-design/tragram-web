import type { Dictionary } from "@/lib/i18n";
import { mapApiFormErrors } from "./auth-form-errors";

type MtField = "server" | "accountNumber" | "password";

const dict = {
    apiErrors: {
        VALIDATION_ERROR: "Validation failed.",
        AUTH_INVALID_PASSWORD: "Password is incorrect",
    },
} as unknown as Dictionary;

const fieldAliases: Record<MtField, readonly string[]> = {
    server: ["server", "broker", "host"],
    accountNumber: ["accountNumber", "account number", "account", "login"],
    password: ["password"],
};

const fieldLabels: Partial<Record<MtField, string>> = {
    server: "Server",
    accountNumber: "Account number",
    password: "Password",
};

describe("mapApiFormErrors", () => {
    test("matches the quoted field name instead of a shorter alias inside it", () => {
        const result = mapApiFormErrors({
            error: { response: { data: { code: 'VALIDATION_ERROR', details: ['"currentPassword" is required'] } } },
            dict,
            fieldAliases: { password: ['password'], currentPassword: ['currentPassword'] },
            fieldLabels: { password: 'Password', currentPassword: 'Current password' },
        });
        expect(result.fieldErrors).toEqual({ currentPassword: 'Current password is required' });
    });
    test("does not turn a provider exception mentioning password into a field error", () => {
        const result = mapApiFormErrors<MtField>({
            error: { response: { data: { message: "password transport failed: INTERNAL_SECRET" } } },
            dict, fieldAliases, fieldLabels, messageFieldMap: { password: "password" },
        });
        expect(result.fieldErrors).toEqual({});
        expect(result.formError).toBeUndefined();
        expect(result.toastMessage).toBeUndefined();
    });
    test("maps a known password code to its field without using provider text", () => {
        const error = {
            response: {
                data: {
                    error: "Password is incorrect",
                    code: "AUTH_INVALID_PASSWORD",
                },
            },
        };

        const result = mapApiFormErrors<MtField>({
            error,
            dict,
            fieldAliases,
            fieldLabels,
            codeFieldMap: { AUTH_INVALID_PASSWORD: "password" },
            messageFieldMap: {
                password: "password",
            },
        });

        expect(result.fieldErrors.password).toBe("Password is incorrect");
        expect(result.formError).toBeUndefined();
        expect(result.toastMessage).toBe("Password is incorrect");
    });

    test("uses form/toast message when payload has only error text and no field match", () => {
        const error = {
            response: {
                data: {
                    error: "Reconnect cooldown active (30s remaining): Account is not connected",
                },
            },
        };

        const result = mapApiFormErrors<MtField>({
            error,
            dict,
            fieldAliases,
            fieldLabels,
        });

        expect(result.fieldErrors).toEqual({});
        expect(result.formError).toBeUndefined();
        expect(result.toastMessage).toBeUndefined();
    });

    test("keeps validation detail to field mapping behavior unchanged", () => {
        const error = {
            response: {
                data: {
                    code: "VALIDATION_ERROR",
                    details: ['"accountNumber" is required'],
                },
            },
        };

        const result = mapApiFormErrors<MtField>({
            error,
            dict,
            fieldAliases,
            fieldLabels,
        });

        expect(result.fieldErrors.accountNumber).toBe("Account number is required");
        expect(result.toastMessage).toBe("Validation failed. Account number is required");
    });
});
