import type { Dictionary } from "@/lib/i18n";
import { resolveApiError } from "@/lib/error-utils";

type CodeFieldMap<TField extends string> = Partial<Record<string, TField | readonly TField[]>>;
type MessageFieldMap<TField extends string> = Partial<Record<string, TField | readonly TField[]>>;

interface MapApiFormErrorsOptions<TField extends string> {
    error: unknown;
    dict: Dictionary;
    fieldAliases: Record<TField, readonly string[]>;
    fieldLabels?: Partial<Record<TField, string>>;
    codeFieldMap?: CodeFieldMap<TField>;
    messageFieldMap?: MessageFieldMap<TField>;
}

interface MappedApiFormErrors<TField extends string> {
    fieldErrors: Partial<Record<TField, string>>;
    formError?: string;
    toastMessage?: string;
}

const normalize = (value: string): string =>
    value.toLowerCase().replace(/[_\-\s]/g, "");

const toMessageText = (detail: string, fieldLabel?: string): string => {
    const trimmed = detail.trim();
    if (!trimmed) return trimmed;

    if (fieldLabel) {
        return trimmed.replace(/^"[^"]+"/, fieldLabel);
    }

    return trimmed.replace(/^"([^"]+)"/, "$1");
};

const findMatchingField = <TField extends string>(
    detail: string,
    fieldAliases: Record<TField, readonly string[]>
): TField | undefined => {
    const quotedToken = detail.match(/"([^"]+)"/)?.[1];
    const normalizedQuotedToken = quotedToken ? normalize(quotedToken) : undefined;

    return (Object.keys(fieldAliases) as TField[]).find((field) =>
        fieldAliases[field].some((alias) => normalizedQuotedToken === normalize(alias))
    );
};

export const mapApiFormErrors = <TField extends string>({
    error,
    dict,
    fieldAliases,
    fieldLabels,
    codeFieldMap,
    messageFieldMap,
}: MapApiFormErrorsOptions<TField>): MappedApiFormErrors<TField> => {
    const {
        details = [],
        code,
        localizedMessage,
    } = resolveApiError(error, dict);
    const fieldErrors: Partial<Record<TField, string>> = {};

    const assignFieldError = (field: TField, message?: string) => {
        if (!message || fieldErrors[field]) return;
        fieldErrors[field] = message;
    };

    const assignMappedFields = (
        mapped: TField | readonly TField[],
        message?: string
    ) => {
        const fields: readonly TField[] = Array.isArray(mapped) ? mapped : [mapped];
        fields.forEach((field) =>
            assignFieldError(field, toMessageText(message ?? "", fields.length === 1 ? fieldLabels?.[field] : undefined))
        );
    };

    // Only known validation grammar may be displayed; details can contain
    // arbitrary provider/SQL exceptions. Match the explicit field token first.
    const safeDetails = code === "VALIDATION_ERROR" ? details.filter((detail) =>
        /^"[\w.]+" (?:is required|is not allowed to be empty|must be a valid email|must be a (?:string|number|boolean)|must be (?:greater|less) than or equal to \d+|length must be at least \d+ characters long)\.?$/.test(detail)
    ) : [];
    safeDetails.forEach((detail) => {
        const field = findMatchingField(detail, fieldAliases);
        if (!field) return;
        assignFieldError(field, toMessageText(detail, fieldLabels?.[field]));
    });

    const mappedCodeFields = code ? codeFieldMap?.[code] : undefined;
    if (mappedCodeFields) {
        const codeMessage =
            code === "VALIDATION_ERROR"
                ? safeDetails[0] || localizedMessage
                : localizedMessage;
        assignMappedFields(mappedCodeFields, codeMessage);
    }

    if (messageFieldMap && code === "VALIDATION_ERROR") {
        const candidates = safeDetails.filter(
            (value): value is string => typeof value === "string" && value.trim().length > 0
        );
        candidates.forEach((candidate) => {
            const normalizedCandidate = normalize(candidate);
            Object.entries(messageFieldMap).forEach(([pattern, mappedFields]) => {
                if (!mappedFields) return;
                if (!normalizedCandidate.includes(normalize(pattern))) return;
                assignMappedFields(mappedFields, candidate);
            });
        });
    }

    const firstFieldMessage = Object.values(fieldErrors).find(
        (value): value is string => typeof value === "string" && value.length > 0
    );
    let toastMessage = localizedMessage;

    if (code === "VALIDATION_ERROR" && firstFieldMessage) {
        toastMessage =
            localizedMessage && localizedMessage !== firstFieldMessage
                ? `${localizedMessage} ${firstFieldMessage}`
                : firstFieldMessage;
    }

    if (!toastMessage && firstFieldMessage) {
        toastMessage = firstFieldMessage;
    }

    const hasFieldErrors = Object.keys(fieldErrors).length > 0;
    const formError = hasFieldErrors
        ? undefined
        : localizedMessage;

    return { fieldErrors, formError, toastMessage };
};
