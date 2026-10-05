"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { connectionsService } from "@/services/connections.service";
import { getErrorCode, getErrorMessage, getLocalizedErrorMessage } from "@/lib/error-utils";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { toast } from "react-hot-toast";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { mapApiFormErrors } from "@/lib/auth-form-errors";
import { useSheetFocusLock } from "@/components/dashboard/use-sheet-focus-lock";
import styles from "./connect-sheets.module.css";

type MtServer = {
  name?: string;
  host?: string;
  hosts?: string[];
  port?: number;
  platform?: "MT4" | "MT5";
  environment?: "DEMO" | "REAL";
};

type MtConnectSheetProps = {
  open: boolean;
  onClose: () => void;
  onConnected?: () => Promise<void> | void;
};

type MtConnectField = "server" | "accountNumber" | "password";

const isCanceledRequestError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { name?: string; code?: string; message?: string };
  return (
    maybeError.name === "AbortError" ||
    maybeError.name === "CanceledError" ||
    maybeError.code === "ERR_CANCELED"
  );
};

const SERVER_SEARCH_DEBOUNCE_MS = 300;

export function MtConnectSheet({ open, onClose, onConnected }: MtConnectSheetProps) {
  const intlMessages = useRouteMessages();
  const t = intlMessages.dashboardPage.mtSheet;
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [servers, setServers] = useState<MtServer[]>([]);
  const [loadingServers, setLoadingServers] = useState(false);
  const [serverQuery, setServerQuery] = useState("exness");
  const [selectedServer, setSelectedServer] = useState<MtServer | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<"MT4" | "MT5">("MT5");
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState<"form" | "success" | "error">("form");
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    server?: string;
    accountNumber?: string;
    password?: string;
    form?: string;
  }>({});

  useSheetFocusLock({
    open,
    containerRef: sheetRef,
    onClose,
  });

  const serverSearchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    const timeoutId = window.setTimeout(() => {
      setView("form");
      setErrorMessage("");
      setSelectedServer(null);
      setAccountNumber("");
      setPassword("");
      setFieldErrors({});
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
      serverSearchAbortRef.current?.abort();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const query = serverQuery.trim();

    // Always cancel any in-flight request when user types or changes filters
    serverSearchAbortRef.current?.abort();

    if (query.length < 2) {
      const timeoutId = window.setTimeout(() => {
        setSelectedServer(null);
        setLoadingServers(false);
        setServers([]);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }

    const timeoutId = window.setTimeout(async () => {
      const controller = new AbortController();
      serverSearchAbortRef.current = controller;

      setSelectedServer(null);
      setLoadingServers(true);
      try {
        const data = await connectionsService.searchMtBrokers(
          { server: query, platform: accountType },
          controller.signal
        );
        if (controller.signal.aborted) return;
        const results = data.servers ?? [];
        setServers(results);
        trackAnalyticsEvent("mt_server_searched", {
          platform: accountType,
          query_length: query.length,
          results_count: results.length,
        });
      } catch (error) {
        if (controller.signal.aborted || isCanceledRequestError(error)) return;
        toast.error(t.toastServersError);
        setServers([]);
      } finally {
        if (!controller.signal.aborted) setLoadingServers(false);
      }
    }, SERVER_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [open, serverQuery, accountType, t.toastServersError]);

  const handleSubmit = async () => {
    const selectedServerName = selectedServer?.name?.trim() ?? "";
    const host = selectedServer?.host ?? selectedServer?.hosts?.[0];
    const port = selectedServer?.port ?? 443;

    const nextFieldErrors: typeof fieldErrors = {};
    if (!selectedServerName || !host) {
      nextFieldErrors.server = t.selectServer;
    }
    if (!accountNumber.trim()) {
      nextFieldErrors.accountNumber = t.accountLabel;
    }
    if (!password.trim()) {
      nextFieldErrors.password = t.passwordLabel;
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors({
        ...nextFieldErrors,
        form: t.toastFormInvalid,
      });
      setView("form");
      toast.error(t.toastFormInvalid);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    trackAnalyticsEvent("mt_connect_started", { source: "web" });
    try {
      await connectionsService.connectMt({
        accountNumber,
        password,
        server: selectedServerName,
        serverName: selectedServerName,
        host,
        port,
        accountType,
      });
      const platform = selectedServer?.platform ?? accountType;
      trackAnalyticsEvent("mt_account_connected", {
        platform,
        server: selectedServerName,
      });
      setView("success");
      toast.success(t.toastConnected);
      if (onConnected) await onConnected();
    } catch (error: unknown) {
      const errorCode = getErrorCode(error);
      trackAnalyticsEvent("mt_connect_failed", {
        platform: selectedServer?.platform ?? accountType,
        server: selectedServerName,
        ...(errorCode && /^[A-Z][A-Z0-9_]{1,63}$/.test(errorCode) ? { error_code: errorCode } : {}),
      });
      const { fieldErrors: mappedFieldErrors, formError, toastMessage } = mapApiFormErrors<MtConnectField>({
        error,
        dict: intlMessages,
        fieldAliases: {
          server: ["server", "broker", "host"],
          accountNumber: ["accountNumber", "account number", "account", "login"],
          password: ["password"],
        },
        fieldLabels: {
          server: t.selectServer,
          accountNumber: t.accountLabel,
          password: t.passwordLabel,
        },
        messageFieldMap: {
          server: "server",
          broker: "server",
          account: "accountNumber",
          login: "accountNumber",
          password: "password",
        },
      });

      const message =
        toastMessage ||
        formError ||
        getLocalizedErrorMessage(error, intlMessages) ||
        getErrorMessage(error) ||
        t.toastConnectionFailed;

      const hasMappedFieldErrors =
        Boolean(mappedFieldErrors.server) ||
        Boolean(mappedFieldErrors.accountNumber) ||
        Boolean(mappedFieldErrors.password);
      if (hasMappedFieldErrors || formError) {
        setFieldErrors({
          server: mappedFieldErrors.server,
          accountNumber: mappedFieldErrors.accountNumber,
          password: mappedFieldErrors.password,
          form: formError,
        });
        setView("form");
      } else {
        setErrorMessage(message);
        setView("error");
      }

      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t.copySuccess);
    } catch {
      toast.error(t.copyError);
    }
  };

  if (!open) return null;

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
            {view === "form" ? t.titleForm : view === "success" ? t.titleSuccess : t.titleError}
          </h2>
          <button type="button" className="dashboard-accounts-add" onClick={onClose}>
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        {view === "form" && (
          <div className="space-y-4 overflow-y-auto pb-4">
            <div className="space-y-2">
              <p className="dashboard-order-sheet-label">{t.platform}</p>
              <select
                className={styles.select}
                value={accountType}
                onChange={(event) => setAccountType(event.target.value as "MT4" | "MT5")}
                aria-label={t.platform}
              >
                <option value="MT5">MT5</option>
                <option value="MT4">MT4</option>
              </select>
            </div>

            <div className="space-y-2">
              <p className="dashboard-order-sheet-label">{t.selectServer}</p>
              <div className={styles.searchBox}>
                <i className={cn("fa-solid fa-magnifying-glass", styles.searchBoxIcon)} aria-hidden="true" />
                <input
                  className={styles.searchInput}
                  placeholder={t.searchPlaceholder}
                  value={serverQuery}
                  onChange={(event) => {
                    setServerQuery(event.target.value);
                    if (fieldErrors.server || fieldErrors.form) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        server: undefined,
                        form: undefined,
                      }));
                    }
                  }}
                  aria-label={t.searchPlaceholder}
                />
              </div>
              <div
                className={cn(
                  styles.serverList,
                  fieldErrors.server && "rounded-xl ring-1 ring-red-400/60"
                )}
              >
                {loadingServers ? (
                  <div className={styles.serverSkeletonList} aria-hidden="true">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={`server-skeleton-${index}`} className={styles.serverSkeletonRow}>
                        <div className={cn(styles.serverSkeletonLine, styles.serverSkeletonLineWide)} />
                        <div className={cn(styles.serverSkeletonLine, styles.serverSkeletonLineShort)} />
                      </div>
                    ))}
                  </div>
                ) : servers.length === 0 ? (
                  <p className="dashboard-message-subtitle">{t.noServers}</p>
                ) : (
                  servers.map((server) => {
                    const selected = selectedServer?.name === server.name;
                    return (
                      <button
                        key={server.name}
                        type="button"
                        className={cn(styles.serverRow, selected && styles.serverRowSelected)}
                        onClick={() => {
                          setSelectedServer(server);
                          if (server.name) {
                            trackAnalyticsEvent("mt_server_selected", {
                              platform: server.platform ?? accountType,
                              server: server.name,
                            });
                          }
                          if (fieldErrors.server || fieldErrors.form) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              server: undefined,
                              form: undefined,
                            }));
                          }
                        }}
                      >
                        <div>
                          <p className="dashboard-order-sheet-title">{server.name}</p>
                          <p className="dashboard-order-sheet-subtitle">
                            {server.environment ?? t.envLive} • {server.platform ?? "MT5"}
                          </p>
                        </div>
                        {selected && <i className="fa-solid fa-check" aria-hidden="true" />}
                      </button>
                    );
                  })
                )}
              </div>
              {fieldErrors.server && (
                <p className="dashboard-order-sheet-subtitle error">{fieldErrors.server}</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <p className="dashboard-order-sheet-label">{t.accountLabel}</p>
                <Input
                  value={accountNumber}
                  onChange={(event) => {
                    setAccountNumber(event.target.value);
                    if (fieldErrors.accountNumber || fieldErrors.form) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        accountNumber: undefined,
                        form: undefined,
                      }));
                    }
                  }}
                  placeholder={t.accountPlaceholder}
                  aria-label={t.accountLabel}
                  invalid={Boolean(fieldErrors.accountNumber)}
                />
                {fieldErrors.accountNumber && (
                  <p className="dashboard-order-sheet-subtitle error">{fieldErrors.accountNumber}</p>
                )}
              </div>
              <div className="space-y-2">
                <p className="dashboard-order-sheet-label">{t.passwordLabel}</p>
                <Input
                  type="password"
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
                  aria-label={t.passwordLabel}
                  invalid={Boolean(fieldErrors.password)}
                />
                {fieldErrors.password && (
                  <p className="dashboard-order-sheet-subtitle error">{fieldErrors.password}</p>
                )}
              </div>
            </div>
            {fieldErrors.form && (
              <p className="dashboard-order-sheet-subtitle error">{fieldErrors.form}</p>
            )}
          </div>
        )}

        {view === "success" && (
          <div className={cn(styles.resultCard, styles.resultCardSuccess)}>
            <div className={styles.resultIcon} aria-hidden="true">
              <i className="fa-solid fa-circle-check" />
            </div>
            <p className="dashboard-message-title">{t.successTitle}</p>
            <p className="dashboard-message-subtitle">{t.successSubtitle}</p>
            <div className={styles.resultDetails}>
              <div>
                <p className="dashboard-order-sheet-label">{t.successAccount}</p>
                <div className={styles.copyRow}>
                  <p className="dashboard-order-sheet-value">#{accountNumber}</p>
                  <button
                    type="button"
                    className="dashboard-link-button"
                    onClick={() => handleCopy(accountNumber)}
                  >
                    {t.copy}
                  </button>
                </div>
              </div>
              <div>
                <p className="dashboard-order-sheet-label">{t.successServer}</p>
                <p className="dashboard-order-sheet-value">{selectedServer?.name ?? "—"}</p>
              </div>
              <div>
                <p className="dashboard-order-sheet-label">{t.successPlatform}</p>
                <p className="dashboard-order-sheet-value">{accountType}</p>
              </div>
            </div>
          </div>
        )}

        {view === "error" && (
          <div className={cn(styles.resultCard, styles.resultCardError)}>
            <div className={styles.resultIcon} aria-hidden="true">
              <i className="fa-solid fa-circle-xmark" />
            </div>
            <p className="dashboard-message-title">{t.errorTitle}</p>
            <p className="dashboard-message-subtitle">
              {errorMessage || t.errorFallback}
            </p>
            <div className={styles.resultDetails}>
              <div>
                <p className="dashboard-order-sheet-label">{t.errorServer}</p>
                <p className="dashboard-order-sheet-value">{selectedServer?.name ?? "—"}</p>
              </div>
              <div>
                <p className="dashboard-order-sheet-label">{t.errorAccount}</p>
                <p className="dashboard-order-sheet-value">{accountNumber || "—"}</p>
              </div>
            </div>
          </div>
        )}

        <div className={styles.sheetFooter}>
          <div className={styles.ctaRow}>
            {view !== "form" && (
              <Button
                variant="outline"
                size="lg"
                className={cn(styles.secondaryCta, "flex-1")}
                onClick={() => {
                  setView("form");
                  setErrorMessage("");
                }}
              >
                {t.ctaRetry}
              </Button>
            )}
            <Button
              className={cn(styles.primaryCta, "flex-1")}
              size="lg"
              disabled={submitting}
              onClick={view === "form" ? handleSubmit : onClose}
            >
              {view === "form"
                ? submitting
                  ? t.ctaConnecting
                  : t.ctaConnect
                : t.ctaDone}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
