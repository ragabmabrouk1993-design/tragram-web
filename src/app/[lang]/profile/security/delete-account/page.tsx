"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/phone/phone-input";
import { PasswordField } from "@/components/form/password-field";
import { ProfileShell } from "@/components/profile/profile-shell";
import {
    userService,
    type RequestAccountDeletionPayload,
} from "@/services/user.service";
import { authService } from "@/services/auth.service";
import { toast } from "react-hot-toast";
import { useLocale } from "next-intl";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { localizePath } from "@/lib/i18n";
import { getLocalizedErrorMessage } from "@/lib/error-utils";
import { isTelegramGatewayPending, type TelegramDelivery } from "@/lib/telegram-delivery";
import { useAppDispatch } from "@/store/hooks";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { clearAuth } from "@/store/authSlice";
import {
    DELETE_REASON_CODES,
    type DeleteFlowStep,
    type DeleteReasonCode,
    buildDeleteReasonPayload,
    buildSecureDeactivatePayload,
    nextStepAfterDeletionRequest,
    validateDeleteReasonSelection,
} from "@/features/delete-account/delete-account-flow";

export default function DeleteAccountPage() {
    const [step, setStep] = useState<DeleteFlowStep>("reason_step");
    const [selectedReasonCode, setSelectedReasonCode] = useState<DeleteReasonCode | null>(null);
    const [otherText, setOtherText] = useState("");
    const [requestId, setRequestId] = useState("");
    const [verificationSessionToken, setVerificationSessionToken] = useState("");
    const [verificationDelivery, setVerificationDelivery] = useState<TelegramDelivery | null>(null);
    const [idempotencyKey, setIdempotencyKey] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [password, setPassword] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [scheduledFor, setScheduledFor] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);

    const router = useRouter();
    const dispatch = useAppDispatch();
    const lang = useLocale();
    const intlMessages = useRouteMessages();

    const reasonOptions = useMemo(
        () =>
            DELETE_REASON_CODES.map((code, index) => ({
                code,
                label: intlMessages.profilePages.deleteAccount.reasons[index] ?? code,
            })),
        [intlMessages]
    );

    const selectedReason =
        reasonOptions.find((option) => option.code === selectedReasonCode) ?? null;
    const isTelegramDeliveryReady = Boolean(verificationSessionToken && verificationDelivery);

    useEffect(() => {
        const query = window.matchMedia("(min-width: 1200px)");
        const apply = (matches: boolean) => setIsDesktop(matches);
        apply(query.matches);

        const handleChange = (event: MediaQueryListEvent) => {
            apply(event.matches);
        };

        if (typeof query.addEventListener === "function") {
            query.addEventListener("change", handleChange);
            return () => query.removeEventListener("change", handleChange);
        }

        query.addListener(handleChange);
        return () => query.removeListener(handleChange);
    }, []);

    useEffect(() => {
        let cancelled = false;
        const loadProfile = async () => {
            try {
                const [profile, deletionStatus] = await Promise.all([
                    authService.getProfile(),
                    userService.getAccountDeletionStatus(),
                ]);
                if (!cancelled) {
                    setPhoneNumber(profile.phoneNumber ?? "");
                    if (deletionStatus.request?.status === "SCHEDULED") {
                        setRequestId(deletionStatus.request.id);
                        setScheduledFor(
                            deletionStatus.request.scheduledFor ?? deletionStatus.deletionScheduledFor
                        );
                        setStep("scheduled_step");
                    }
                }
            } catch {
                // Profile fallback is best-effort only for prefilling phone number.
            }
        };
        loadProfile();

        return () => {
            cancelled = true;
        };
    }, []);

    const buildReasonPayload = (): RequestAccountDeletionPayload | null => {
        return buildDeleteReasonPayload({
            reasonCode: selectedReason?.code ?? null,
            reasonDetails: otherText,
        });
    };

    const handleRequestDeletion = async () => {
        const reasonValidation = validateDeleteReasonSelection(selectedReasonCode, otherText);
        if (reasonValidation === "missing_reason") {
            toast.error(intlMessages.profilePages.deleteAccount.toastSelectReason);
            return;
        }

        if (reasonValidation === "missing_other_details") {
            toast.error(intlMessages.profilePages.deleteAccount.toastOtherReasonRequired);
            return;
        }

        const payload = buildReasonPayload();
        if (!payload) {
            toast.error(intlMessages.profilePages.deleteAccount.toastOtherReasonRequired);
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await userService.requestAccountDeletion(payload);
            setRequestId(result.requestId);
            setVerificationSessionToken(result.verificationSessionToken ?? "");
            setVerificationDelivery((result.delivery as TelegramDelivery | undefined) ?? null);
            setIdempotencyKey(crypto.randomUUID());
            setStep(nextStepAfterDeletionRequest());
            setOtpCode("");
            setPassword("");
            toast.success(intlMessages.profilePages.deleteAccount.toastRequestSuccess);
        } catch (error) {
            toast.error(
                getLocalizedErrorMessage(error, intlMessages) ||
                    intlMessages.profilePages.deleteAccount.toastRequestError
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendCode = async () => {
        const payload = buildReasonPayload();
        if (!payload) {
            toast.error(
                selectedReasonCode === "OTHER"
                    ? intlMessages.profilePages.deleteAccount.toastOtherReasonRequired
                    : intlMessages.profilePages.deleteAccount.toastSelectReason
            );
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await userService.requestAccountDeletion({ ...payload, isResend: true });
            setRequestId(result.requestId);
            setVerificationSessionToken(result.verificationSessionToken ?? "");
            setVerificationDelivery((result.delivery as TelegramDelivery | undefined) ?? null);
            setIdempotencyKey(crypto.randomUUID());
            toast.success(intlMessages.profilePages.deleteAccount.toastCodeResent);
        } catch (error) {
            toast.error(
                getLocalizedErrorMessage(error, intlMessages) ||
                    intlMessages.profilePages.deleteAccount.toastRequestError
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmDeletion = async (mode: "IMMEDIATE" | "SCHEDULED") => {
        const payload = buildSecureDeactivatePayload({
            requestId,
            phoneNumber,
            otpCode,
            password,
            mode,
            verificationSessionToken,
        });
        if (!payload) {
            toast.error(intlMessages.profilePages.deleteAccount.toastVerificationRequired);
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await userService.confirmAccountDeletion({
                ...payload,
                ...(idempotencyKey ? { idempotencyKey } : {}),
            });
            trackAnalyticsEvent("account_deletion_requested", {
                has_details: Boolean(otherText.trim()),
                is_resend: false,
            });
            if (result.mode === "IMMEDIATE") {
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                dispatch(clearAuth());
                toast.success(intlMessages.profilePages.deleteAccount.toastDeletionSuccess);
                router.replace(localizePath(lang, "/auth/login"));
                return;
            }

            setScheduledFor(result.scheduledFor ?? null);
            setStep("scheduled_step");
            toast.success(intlMessages.profilePages.deleteAccount.toastScheduledSuccess);
        } catch (error) {
            toast.error(
                getLocalizedErrorMessage(error, intlMessages) ||
                    intlMessages.profilePages.deleteAccount.toastDeletionError
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelScheduledDeletion = async () => {
        if (!requestId) {
            return;
        }

        setIsSubmitting(true);
        try {
            await userService.cancelAccountDeletion(requestId);
            setScheduledFor(null);
            setStep("reason_step");
            setRequestId("");
            setVerificationSessionToken("");
            setVerificationDelivery(null);
            setIdempotencyKey("");
            setOtpCode("");
            setPassword("");
            toast.success(intlMessages.profilePages.deleteAccount.toastScheduledCancelSuccess);
        } catch (error) {
            toast.error(
                getLocalizedErrorMessage(error, intlMessages) ||
                    intlMessages.profilePages.deleteAccount.toastScheduledCancelError
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ProfileShell
            title={intlMessages.profilePages.deleteAccount.title}
            subtitle={intlMessages.profilePages.deleteAccount.subtitle}
            backHref="/profile/security"
            variant={isDesktop ? "default" : "mobile"}
            shellClassName="profile-delete-shell"
            showSidebar={!isDesktop}
            showBreadcrumbs={!isDesktop}
        >
            <div className="profile-delete-stage profile-mobile-adaptive-layout">
                {isDesktop && (
                    <div className="profile-delete-hero">
                        <span className="profile-delete-eyebrow">{intlMessages.profilePages.security.title}</span>
                        <h1 className="profile-delete-hero-title">{intlMessages.profilePages.deleteAccount.title}</h1>
                        <p className="profile-delete-hero-copy">
                            {step === "reason_step"
                                ? intlMessages.profilePages.deleteAccount.intro
                                : intlMessages.profilePages.deleteAccount.verifyIntro}
                        </p>
                    </div>
                )}

                <div className="profile-delete-flow">
                    <div className="profile-card profile-delete-panel">
                        <div className="profile-delete-callout">
                            <p className="profile-delete-callout-title">
                                {step === "reason_step"
                                    ? intlMessages.profilePages.deleteAccount.title
                                    : intlMessages.profilePages.deleteAccount.confirmationTitle}
                            </p>
                            <p className="profile-delete-callout-copy">
                                {step === "reason_step"
                                    ? intlMessages.profilePages.deleteAccount.intro
                                    : step === "scheduled_step"
                                      ? intlMessages.profilePages.deleteAccount.scheduledCallout
                                      : intlMessages.profilePages.deleteAccount.confirmationBody}
                            </p>
                        </div>

                        {step === "reason_step" ? (
                            <>
                                <div className="profile-delete-section-heading">
                                    <p className="profile-delete-section-title">
                                        {intlMessages.profilePages.deleteAccount.reasonListAriaLabel}
                                    </p>
                                    <p className="profile-delete-section-copy">
                                        {intlMessages.profilePages.deleteAccount.subtitle}
                                    </p>
                                </div>

                                <div
                                    className="profile-delete-chip-list"
                                    role="listbox"
                                    aria-label={intlMessages.profilePages.deleteAccount.reasonListAriaLabel}
                                >
                                    {reasonOptions.map((reason) => {
                                        const isActive = selectedReasonCode === reason.code;
                                        return (
                                            <button
                                                key={reason.code}
                                                type="button"
                                                aria-pressed={isActive}
                                                onClick={() => setSelectedReasonCode(reason.code)}
                                                className={`profile-delete-chip${isActive ? " is-active" : ""}`}
                                            >
                                                {reason.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                {selectedReason && (
                                    <p className="profile-delete-selected-reason">
                                        <span>{selectedReason.label}</span>
                                    </p>
                                )}

                                {selectedReasonCode === "OTHER" && (
                                    <textarea
                                        value={otherText}
                                        onChange={(event) => setOtherText(event.target.value)}
                                        placeholder={intlMessages.profilePages.deleteAccount.otherPlaceholder}
                                        className="profile-textarea profile-delete-textarea"
                                        rows={4}
                                        minLength={3}
                                        maxLength={1200}
                                    />
                                )}

                                <div className="profile-delete-footer">
                                    <p className="profile-delete-footer-copy">
                                        {intlMessages.profilePages.deleteAccount.retentionBody}
                                    </p>
                                    <Button
                                        variant="gradient"
                                        className="profile-button profile-button-full profile-delete-primary-button"
                                        onClick={handleRequestDeletion}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting
                                            ? intlMessages.profilePages.deleteAccount.buttonProcessing
                                            : intlMessages.profilePages.deleteAccount.buttonContinue}
                                    </Button>
                                </div>
                            </>
                        ) : step === "scheduled_step" ? (
                            <div className="profile-form">
                                <div className="profile-delete-selected-reason">
                                    <span>
                                        {intlMessages.profilePages.deleteAccount.scheduledBadge}
                                        {scheduledFor
                                            ? ` ${intlMessages.profilePages.deleteAccount.scheduledBadgeDatePrefix} ${new Date(scheduledFor).toLocaleString()}`
                                            : ""}
                                    </span>
                                </div>
                                <p className="profile-card-text">
                                    {intlMessages.profilePages.deleteAccount.scheduledBody}
                                </p>
                                <div className="profile-delete-actions">
                                    <Button
                                        variant="ghost"
                                        className="profile-button profile-button-outline"
                                        onClick={handleCancelScheduledDeletion}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting
                                            ? intlMessages.profilePages.deleteAccount.buttonProcessing
                                            : intlMessages.profilePages.deleteAccount.buttonCancelScheduled}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {selectedReason && (
                                    <p className="profile-delete-selected-reason">
                                        <span>{selectedReason.label}</span>
                                    </p>
                                )}

                                <div className="profile-form">
                                    <div className="profile-field">
                                        <span className="profile-field-label">
                                            {intlMessages.profilePages.deleteAccount.phoneLabel}
                                        </span>
                                        <PhoneInput
                                            value={phoneNumber}
                                            onChange={setPhoneNumber}
                                            defaultCountry="US"
                                            placeholder={intlMessages.profilePages.deleteAccount.phonePlaceholder}
                                            ariaLabel={intlMessages.profilePages.deleteAccount.phoneLabel}
                                            disabled={isSubmitting}
                                        />
                                    </div>

                                    {isTelegramDeliveryReady ? (
                                        <>
                                            {isTelegramGatewayPending(verificationDelivery) ? (
                                                <p className="profile-card-text" role="status">
                                                    {intlMessages.auth.telegramDelivery.gatewayPending}
                                                </p>
                                            ) : null}
                                            <div className="profile-field">
                                                <span className="profile-field-label">
                                                    {intlMessages.profilePages.deleteAccount.otpLabel}
                                                </span>
                                                <Input
                                                    value={otpCode}
                                                    onChange={(event) => setOtpCode(event.target.value)}
                                                    placeholder={intlMessages.profilePages.deleteAccount.otpPlaceholder}
                                                    className="profile-input"
                                                    inputMode="numeric"
                                                    autoComplete="one-time-code"
                                                    maxLength={6}
                                                    disabled={isSubmitting}
                                                />
                                            </div>

                                            <div className="profile-field">
                                                <span className="profile-field-label">
                                                    {intlMessages.profilePages.deleteAccount.passwordLabel}
                                                </span>
                                                <PasswordField
                                                    placeholder={intlMessages.profilePages.deleteAccount.passwordPlaceholder}
                                                    inputProps={{
                                                        value: password,
                                                        onChange: (event) => setPassword(event.target.value),
                                                        autoComplete: "current-password",
                                                        "aria-label": intlMessages.profilePages.deleteAccount.passwordLabel,
                                                    }}
                                                    disabled={isSubmitting}
                                                />
                                            </div>

                                            <div className="profile-delete-actions">
                                                <Button
                                                    variant="ghost"
                                                    className="profile-button profile-button-outline"
                                                    onClick={() => setStep("reason_step")}
                                                    disabled={isSubmitting}
                                                >
                                                    {intlMessages.profilePages.deleteAccount.buttonBackToReason}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    className="profile-button profile-button-outline"
                                                    onClick={handleResendCode}
                                                    disabled={isSubmitting}
                                                >
                                                    {intlMessages.profilePages.deleteAccount.buttonResendCode}
                                                </Button>
                                                <Button
                                                    variant="gradient"
                                                    className="profile-button profile-delete-primary-button"
                                                    onClick={() => handleConfirmDeletion("IMMEDIATE")}
                                                    disabled={isSubmitting}
                                                >
                                                    {isSubmitting
                                                        ? intlMessages.profilePages.deleteAccount.buttonConfirming
                                                        : intlMessages.profilePages.deleteAccount.buttonDeleteNow}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    className="profile-button profile-button-outline"
                                                    onClick={() => handleConfirmDeletion("SCHEDULED")}
                                                    disabled={isSubmitting}
                                                >
                                                    {isSubmitting
                                                        ? intlMessages.profilePages.deleteAccount.buttonConfirming
                                                        : intlMessages.profilePages.deleteAccount.buttonScheduleSevenDays}
                                                </Button>
                                            </div>
                                        </>
                                    ) : null}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="profile-card profile-delete-retention">
                        <p className="profile-delete-retention-title">
                            {intlMessages.profilePages.deleteAccount.retentionTitle}
                        </p>
                        <p className="profile-card-text profile-delete-retention-copy">
                            {intlMessages.profilePages.deleteAccount.retentionBody}
                        </p>
                    </div>
                </div>
            </div>
        </ProfileShell>
    );
}
