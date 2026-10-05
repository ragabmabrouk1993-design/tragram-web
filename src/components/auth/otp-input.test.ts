import { applyOtpChunkAtIndex, sanitizeOtpValue } from "./otp-input";

describe("otp-input helpers", () => {
    test("sanitizeOtpValue keeps only digits and applies max length", () => {
        expect(sanitizeOtpValue("12a3-45_678", 6)).toBe("123456");
    });

    test("applyOtpChunkAtIndex fills sequentially from first index", () => {
        expect(
            applyOtpChunkAtIndex({
                currentValue: "",
                index: 0,
                chunk: "123456",
                length: 6,
            })
        ).toEqual({
            nextValue: "123456",
            nextFocusIndex: 5,
            insertedDigits: 6,
        });
    });

    test("applyOtpChunkAtIndex fills from active middle index", () => {
        expect(
            applyOtpChunkAtIndex({
                currentValue: "120000",
                index: 2,
                chunk: "345",
                length: 6,
            })
        ).toEqual({
            nextValue: "123450",
            nextFocusIndex: 5,
            insertedDigits: 3,
        });
    });

    test("applyOtpChunkAtIndex ignores non-digit chunk and keeps value", () => {
        expect(
            applyOtpChunkAtIndex({
                currentValue: "1234",
                index: 1,
                chunk: "abc",
                length: 6,
            })
        ).toEqual({
            nextValue: "1234",
            nextFocusIndex: 1,
            insertedDigits: 0,
        });
    });

    test("applyOtpChunkAtIndex clears current index when requested", () => {
        expect(
            applyOtpChunkAtIndex({
                currentValue: "123456",
                index: 2,
                chunk: "",
                length: 6,
                clearWhenEmpty: true,
            })
        ).toEqual({
            nextValue: "12456",
            nextFocusIndex: 2,
            insertedDigits: 0,
        });
    });

    test("applyOtpChunkAtIndex truncates overflow at otp length", () => {
        expect(
            applyOtpChunkAtIndex({
                currentValue: "123456",
                index: 4,
                chunk: "9876",
                length: 6,
            })
        ).toEqual({
            nextValue: "123498",
            nextFocusIndex: 5,
            insertedDigits: 2,
        });
    });
});
