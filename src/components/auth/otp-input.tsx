import * as React from "react";
import { cn } from "@/lib/utils";

const normalizeLength = (length: number) => Math.max(1, Math.floor(length));

export const sanitizeOtpValue = (value: string, length: number) =>
    value.replace(/\D/g, "").slice(0, normalizeLength(length));

const clampOtpIndex = (index: number, length: number) =>
    Math.min(Math.max(index, 0), normalizeLength(length) - 1);

const toOtpDigits = (value: string, length: number) => {
    const normalizedValue = sanitizeOtpValue(value, length);
    return Array.from({ length: normalizeLength(length) }, (_, index) => normalizedValue[index] ?? "");
};

type ApplyOtpChunkAtIndexInput = {
    currentValue: string;
    index: number;
    chunk: string;
    length: number;
    clearWhenEmpty?: boolean;
};

type ApplyOtpChunkAtIndexResult = {
    nextValue: string;
    nextFocusIndex: number;
    insertedDigits: number;
};

export function applyOtpChunkAtIndex({
    currentValue,
    index,
    chunk,
    length,
    clearWhenEmpty = false,
}: ApplyOtpChunkAtIndexInput): ApplyOtpChunkAtIndexResult {
    const safeLength = normalizeLength(length);
    const clampedIndex = clampOtpIndex(index, safeLength);
    const nextDigits = toOtpDigits(currentValue, safeLength);
    const cleanChunk = sanitizeOtpValue(chunk, safeLength);

    if (!cleanChunk) {
        if (clearWhenEmpty) {
            nextDigits[clampedIndex] = "";
        }

        return {
            nextValue: sanitizeOtpValue(nextDigits.join(""), safeLength),
            nextFocusIndex: clampedIndex,
            insertedDigits: 0,
        };
    }

    let cursor = clampedIndex;
    let insertedDigits = 0;

    for (const digit of cleanChunk) {
        if (cursor >= safeLength) {
            break;
        }
        nextDigits[cursor] = digit;
        cursor += 1;
        insertedDigits += 1;
    }

    return {
        nextValue: sanitizeOtpValue(nextDigits.join(""), safeLength),
        nextFocusIndex: Math.min(cursor, safeLength - 1),
        insertedDigits,
    };
}

interface OTPInputProps {
    value: string;
    onChange: (value: string) => void;
    length?: number;
    tone?: "light" | "dark";
    className?: string;
    inputClassName?: string;
    emptyPlaceholder?: string;
    error?: boolean;
    disabled?: boolean;
    onComplete?: (value: string) => void;
}

export function OTPInput({
    value,
    onChange,
    length = 6,
    tone = "light",
    className,
    inputClassName,
    emptyPlaceholder = "",
    error = false,
    disabled = false,
    onComplete,
}: OTPInputProps) {
    const safeLength = normalizeLength(length);
    const normalizedValue = sanitizeOtpValue(value, safeLength);
    const inputRefs = React.useRef<Array<HTMLInputElement | null>>([]);
    const lastCompletedValueRef = React.useRef<string | null>(null);
    const digits = React.useMemo(() => toOtpDigits(normalizedValue, safeLength), [normalizedValue, safeLength]);

    const updateValue = React.useCallback(
        (nextValue: string) => {
            onChange(sanitizeOtpValue(nextValue, safeLength));
        },
        [onChange, safeLength]
    );

    React.useEffect(() => {
        if (!onComplete) {
            return;
        }

        if (normalizedValue.length === safeLength) {
            if (lastCompletedValueRef.current !== normalizedValue) {
                lastCompletedValueRef.current = normalizedValue;
                onComplete(normalizedValue);
            }
            return;
        }

        lastCompletedValueRef.current = null;
    }, [normalizedValue, onComplete, safeLength]);

    const applyChunk = React.useCallback(
        (index: number, chunk: string, clearWhenEmpty: boolean) => {
            const result = applyOtpChunkAtIndex({
                currentValue: normalizedValue,
                index,
                chunk,
                length: safeLength,
                clearWhenEmpty,
            });

            if (result.nextValue !== normalizedValue) {
                updateValue(result.nextValue);
            }

            if (result.insertedDigits > 0 && result.nextFocusIndex !== index) {
                inputRefs.current[result.nextFocusIndex]?.focus();
            }
        },
        [normalizedValue, safeLength, updateValue]
    );

    const handleChange = (index: number, nextValue: string) => {
        applyChunk(index, nextValue, nextValue.length === 0);
    };

    const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Backspace" && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (index: number, event: React.ClipboardEvent<HTMLInputElement>) => {
        event.preventDefault();
        const pasted = event.clipboardData.getData("text");
        applyChunk(index, pasted, false);
    };

    return (
        <div
            className={cn("mx-auto grid w-full max-w-[22rem] gap-2 sm:gap-3", className)}
            style={{ gridTemplateColumns: `repeat(${safeLength}, minmax(0, 1fr))` }}
            dir="ltr"
        >
            {digits.map((digit, index) => (
                <input
                    key={index}
                    ref={(el) => {
                        inputRefs.current[index] = el;
                    }}
                    value={digit}
                    onChange={(event) => handleChange(index, event.target.value)}
                    onKeyDown={(event) => handleKeyDown(index, event)}
                    onPaste={(event) => handlePaste(index, event)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={safeLength}
                    placeholder={emptyPlaceholder}
                    aria-invalid={error}
                    aria-disabled={disabled}
                    disabled={disabled}
                    className={cn(
                        tone === "dark"
                            ? "h-12 w-full min-w-0 rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] text-center text-lg font-semibold text-[var(--input-text)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                            : "h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white text-center text-lg font-semibold text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60",
                        error && "border-red-400",
                        inputClassName
                    )}
                />
            ))}
        </div>
    );
}
