"use client";

import { useEffect, useRef, useState } from "react";
import type { CountryCode } from "libphonenumber-js";
import { PhoneInput } from "@/components/phone/phone-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import { connectionsService } from "@/services/connections.service";
import {
  getTelegramRequestCooldownMessage,
  getTelegramRetryAfterSeconds,
  isTelegramAccountConnected,
} from "@/services/telegram-account-auth-errors";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { mapApiFormErrors } from "@/lib/auth-form-errors";
import { getErrorCode, getErrorMessage, getLocalizedErrorMessage } from "@/lib/error-utils";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { useSheetFocusLock } from "@/components/dashboard/use-sheet-focus-lock";
import { cn } from "@/lib/utils";
import styles from "./connect-sheets.module.css";

type TelegramConnectSheetProps = {
  open: boolean;
  onClose: () => void;
  onConnected?: (connected: boolean) => Promise<void> | void;
  defaultCountry?: CountryCode;
};

type TelegramConnectField = "phoneNumber" | "code" | "password";

export function TelegramConnectSheet({
  open,
  onClose,
  onConnected,
  defaultCountry = "US",
}: TelegramConnectSheetProps) {
  const intlMessages = useRouteMessages();
  const t = intlMessages.dashboardPage.telegramSheet;
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [step, setStep] = useState<"phone" | "code" | "password">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [codeHash, setCodeHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<{
    phoneNumber?: string;
    code?: string;
    password?: string;
    form?: string;
  }>({});
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [resolvedDefaultCountry, setResolvedDefaultCountry] = useState<CountryCode>(
    defaultCountry
  );

  useEffect(() => {
    if (!open) return;
    const timeoutId = window.setTimeout(() => {
      setStep("phone");
      setPhoneNumber("");
      setCode("");
      setPassword("");
      setCodeHash("");
      setTimeLeft(0);
      setFieldErrors({});
      setResolvedDefaultCountry(defaultCountry);
    }, 0);
    connectionsService
      .getTelegramStatus()
      .then((status) => setTelegramConnected(Boolean(status?.isConnected)))
      .catch(() => setTelegramConnected(false));
    return () => window.clearTimeout(timeoutId);
  }, [defaultCountry, open]);

  useSheetFocusLock({
    open,
    containerRef: sheetRef,
    onClose,
  });

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const handleRequest = async () => {
    if (!phoneNumber) {
      setFieldErrors({ phoneNumber: t.errorPhone });
      toast.error(t.errorPhone);
      return;
    }
    setLoading(true);
    setFieldErrors({});
    trackAnalyticsEvent("telegram_connect_started", { source: "web" });
    try {
      const res = await connectionsService.requestTelegramCode(phoneNumber);
      const hash = (res as { phoneCodeHash?: string })?.phoneCodeHash ?? "";
      setCodeHash(hash);
      toast.success(t.toastCodeSent);
      setStep("code");
      setTimeLeft(60);
      trackAnalyticsEvent("telegram_code_requested");
    } catch (err: unknown) {
      const errorCode = getErrorCode(err);
      trackAnalyticsEvent("telegram_connect_failed", {
        step: "request_code",
        ...(errorCode && /^[A-Z][A-Z0-9_]{1,63}$/.test(errorCode) ? { error_code: errorCode } : {}),
      });
      const retryAfterSeconds = getTelegramRetryAfterSeconds(err);
      if (retryAfterSeconds > 0) setTimeLeft(retryAfterSeconds);
      const { fieldErrors: mappedFieldErrors, formError, toastMessage } =
        mapApiFormErrors<TelegramConnectField>({
          error: err,
          dict: intlMessages,
          fieldAliases: {
            phoneNumber: ["phoneNumber", "phone number", "phone", "number"],
            code: ["code", "otp", "verification code", "phoneCode", "phone code"],
            password: ["password", "2fa", "two factor", "two-factor"],
          },
          fieldLabels: {
            phoneNumber: t.errorPhone,
            code: t.codePlaceholder,
            password: t.passwordPlaceholder,
          },
          codeFieldMap: {
            AUTH_OTP_INVALID: "code",
            VALIDATION_ERROR: "phoneNumber",
          },
          messageFieldMap: {
            phone: "phoneNumber",
            "verification code": "code",
            otp: "code",
            password: "password",
          },
        });

      const fallback = getErrorMessage(err) || t.toastSendError;
      setFieldErrors({
        phoneNumber: mappedFieldErrors.phoneNumber,
        form: formError,
      });
      toast.error(toastMessage || formError || fallback);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!code || !codeHash) {
      setFieldErrors({ code: t.errorCode });
      toast.error(t.errorCode);
      return;
    }
    setLoading(true);
    setFieldErrors((prev) => ({
      ...prev,
      code: undefined,
      password: undefined,
      form: undefined,
    }));
    try {
      const result = await connectionsService.verifyTelegramCode({
        phoneNumber,
        phoneCode: code,
        phoneCodeHash: codeHash,
      });
      trackAnalyticsEvent("telegram_code_verified", { requires_2fa: result.requires2fa === true });
      if (result.requires2fa) {
        setStep("password");
        setPassword("");
        setCode("");
        toast(t.toast2faRequired);
        return;
      }
      toast.success(t.toastConnected);
      trackAnalyticsEvent("telegram_connected");
      setTelegramConnected(true);
      if (onConnected) void onConnected(true);
      onClose();
    } catch (err: unknown) {
      const currentStatus = await connectionsService.getTelegramStatus().catch(() => null);
      if (isTelegramAccountConnected(currentStatus)) {
        trackAnalyticsEvent("telegram_code_verified", { requires_2fa: false });
        trackAnalyticsEvent("telegram_connected");
        setTelegramConnected(true);
        if (onConnected) void onConnected(true);
        onClose();
        return;
      }
      const errorCode = getErrorCode(err);
      trackAnalyticsEvent("telegram_connect_failed", {
        step: "verify_code",
        ...(errorCode && /^[A-Z][A-Z0-9_]{1,63}$/.test(errorCode) ? { error_code: errorCode } : {}),
      });
      const { fieldErrors: mappedFieldErrors, formError, toastMessage } =
        mapApiFormErrors<TelegramConnectField>({
          error: err,
          dict: intlMessages,
          fieldAliases: {
            phoneNumber: ["phoneNumber", "phone number", "phone", "number"],
            code: ["code", "otp", "verification code", "phoneCode", "phone code"],
            password: ["password", "2fa", "two factor", "two-factor"],
          },
          fieldLabels: {
            phoneNumber: t.errorPhone,
            code: t.codePlaceholder,
            password: t.passwordPlaceholder,
          },
          codeFieldMap: {
            AUTH_OTP_INVALID: "code",
          },
          messageFieldMap: {
            "verification code": "code",
            otp: "code",
            password: "password",
          },
        });

      const fallback = getErrorMessage(err) || t.toastVerifyError;
      setFieldErrors((prev) => ({
        ...prev,
        code: mappedFieldErrors.code,
        password: mappedFieldErrors.password,
        form: formError,
      }));
      toast.error(toastMessage || formError || fallback);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPassword = async () => {
    if (!password.trim()) {
      setFieldErrors({ password: t.errorPassword });
      toast.error(t.errorPassword);
      return;
    }
    setLoading(true);
    setFieldErrors((prev) => ({ ...prev, password: undefined, form: undefined }));
    try {
      await connectionsService.verifyTelegramPassword(password);
      trackAnalyticsEvent("telegram_2fa_submitted", { success: true });
      toast.success(t.toastConnected);
      trackAnalyticsEvent("telegram_connected");
      setTelegramConnected(true);
      if (onConnected) void onConnected(true);
      onClose();
    } catch (err: unknown) {
      const currentStatus = await connectionsService.getTelegramStatus().catch(() => null);
      if (isTelegramAccountConnected(currentStatus)) {
        trackAnalyticsEvent("telegram_2fa_submitted", { success: true });
        trackAnalyticsEvent("telegram_connected");
        setTelegramConnected(true);
        if (onConnected) void onConnected(true);
        onClose();
        return;
      }
      const errorCode = getErrorCode(err);
      trackAnalyticsEvent("telegram_2fa_submitted", { success: false });
      trackAnalyticsEvent("telegram_connect_failed", {
        step: "2fa",
        ...(errorCode && /^[A-Z][A-Z0-9_]{1,63}$/.test(errorCode) ? { error_code: errorCode } : {}),
      });
      const { fieldErrors: mappedFieldErrors, formError, toastMessage } =
        mapApiFormErrors<TelegramConnectField>({
          error: err,
          dict: intlMessages,
          fieldAliases: {
            phoneNumber: ["phoneNumber", "phone number", "phone", "number"],
            code: ["code", "otp", "verification code", "phoneCode", "phone code"],
            password: ["password", "2fa", "two factor", "two-factor"],
          },
          fieldLabels: {
            password: t.passwordPlaceholder,
          },
          messageFieldMap: {
            password: "password",
          },
        });

      const fallback = getErrorMessage(err) || t.toastPasswordError;
      setFieldErrors((prev) => ({
        ...prev,
        password: mappedFieldErrors.password,
        form: formError,
      }));
      toast.error(toastMessage || formError || fallback);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setFieldErrors((prev) => ({ ...prev, form: undefined }));
    try {
      await connectionsService.disconnectTelegram();
      setTelegramConnected(false);
      toast.success(t.toastDisconnected);
      if (onConnected) void onConnected(false);
    } catch (err: unknown) {
      const message =
        getLocalizedErrorMessage(err, intlMessages) ||
        getErrorMessage(err) ||
        t.toastDisconnectError;
      setFieldErrors((prev) => ({ ...prev, form: message }));
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const requestCooldownMessage = getTelegramRequestCooldownMessage(
    timeLeft,
    t.requestCooldown
  );

  return (
    <div className="dashboard-sheet-backdrop" onClick={onClose}>
      <div
        className={cn("dashboard-accounts-sheet", styles.connectSheet)}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t.aria}
        ref={sheetRef}
      >
        <div className="dashboard-sheet-handle" aria-hidden="true" />
        <div className="dashboard-accounts-header">
          <h2>
            {step === "phone" ? t.titlePhone : step === "code" ? t.titleCode : t.titlePassword}
          </h2>
          <button type="button" className="dashboard-accounts-add" onClick={onClose}>
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        {step === "phone" ? (
          <div className="space-y-4">
            <p className={cn("dashboard-order-sheet-subtitle", styles.connectDescription)}>
              {t.descriptionSend}
            </p>
            {requestCooldownMessage && (
              <p className="dashboard-order-sheet-subtitle" role="status" aria-live="polite">
                {requestCooldownMessage}
              </p>
            )}
            <PhoneInput
              defaultCountry={resolvedDefaultCountry}
              value={phoneNumber}
              onChange={(value) => {
                setPhoneNumber(value);
                if (fieldErrors.phoneNumber || fieldErrors.form) {
                  setFieldErrors((prev) => ({
                    ...prev,
                    phoneNumber: undefined,
                    form: undefined,
                  }));
                }
              }}
              tone="dark"
              error={fieldErrors.phoneNumber}
            />
            {telegramConnected && (
              <div className="dashboard-message-card dashboard-card-muted">
                <p className="dashboard-message-title">{t.alreadyConnectedTitle}</p>
                <p className="dashboard-message-subtitle">
                  {t.alreadyConnectedSubtitle}
                </p>
              </div>
            )}
          </div>
        ) : step === "code" ? (
          <div className="space-y-3">
            <p className={cn("dashboard-order-sheet-subtitle", styles.connectDescription)}>
              {t.descriptionCode}{" "}
              {timeLeft > 0
                ? t.resendIn.replace("{seconds}", String(timeLeft).padStart(2, "0"))
                : t.resendNow}
            </p>
            <Input
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                if (fieldErrors.code || fieldErrors.form) {
                  setFieldErrors((prev) => ({
                    ...prev,
                    code: undefined,
                    form: undefined,
                  }));
                }
              }}
              placeholder={t.codePlaceholder}
              maxLength={6}
              aria-label={t.codePlaceholder}
              invalid={Boolean(fieldErrors.code)}
              aria-required="true"
            />
            {fieldErrors.code && (
              <p className="dashboard-order-sheet-subtitle error mt-2">{fieldErrors.code}</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className={cn("dashboard-order-sheet-subtitle", styles.connectDescription)}>
              {t.descriptionPassword}
            </p>
            <Input
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (fieldErrors.password || fieldErrors.form) {
                  setFieldErrors((prev) => ({
                    ...prev,
                    password: undefined,
                    form: undefined,
                  }));
                }
              }}
              placeholder={t.passwordPlaceholder}
              type="password"
              aria-label={t.passwordPlaceholder}
              invalid={Boolean(fieldErrors.password)}
              aria-required="true"
            />
            {fieldErrors.password && (
              <p className="dashboard-order-sheet-subtitle error mt-2">{fieldErrors.password}</p>
            )}
          </div>
        )}

        {fieldErrors.form && (
          <p className="dashboard-order-sheet-subtitle error mt-2">{fieldErrors.form}</p>
        )}

        <div className={styles.sheetFooter}>
          <div className={styles.ctaRow}>
            {step === "code" && (
              <Button
                variant="outline"
                size="lg"
                className={cn(styles.secondaryCta, "flex-1")}
                disabled={loading || timeLeft > 0}
                onClick={handleRequest}
              >
                {t.buttonResend}
              </Button>
            )}
            <Button
              className={cn(styles.primaryCta, "flex-1")}
              size="lg"
              disabled={loading || (step === "phone" && timeLeft > 0)}
              onClick={
                step === "phone"
                  ? handleRequest
                  : step === "code"
                    ? handleVerify
                    : handleVerifyPassword
              }
            >
              {loading
                ? t.buttonWait
                : step === "phone"
                  ? timeLeft > 0
                    ? t.buttonWait
                    : t.buttonSend
                  : step === "code"
                    ? t.buttonVerify
                    : t.buttonVerifyPassword}
            </Button>
            {telegramConnected && step === "phone" && (
              <Button
                variant="destructive"
                size="lg"
                className="rounded-full flex-1"
                disabled={loading}
                onClick={handleDisconnect}
              >
                {t.buttonDisconnect}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
