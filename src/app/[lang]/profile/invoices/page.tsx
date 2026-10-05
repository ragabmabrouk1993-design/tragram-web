"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileShell } from "@/components/profile/profile-shell";
import { useLocale } from "next-intl";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { toast } from "react-hot-toast";
import { getLocalizedErrorMessage } from "@/lib/error-utils";
import {
    paymentService,
    BillingHistoryEntry,
    BillingHistoryCoverage,
    InvoicePagination,
    formatInvoiceStatusLabel,
} from "@/services/payment.service";
import { localizePath } from "@/lib/i18n";
import { isBillingDisabledInCurrentEnv } from "@/lib/runtime-environment";

const PAGE_SIZE = 8;

const statusClasses: Record<string, string> = {
    paid: "is-paid",
    active: "is-active",
    prepared: "is-prepared",
    confirming: "is-confirming",
    pending_verification: "is-pending-verification",
    expired: "is-expired",
    error: "is-error",
    cancelled: "is-cancelled",
};

const formatDate = (value?: string | Date | null, locale?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
    }).format(date);
};

const InvoicesSkeleton = () => (
    <div className="profile-invoices-skeleton" aria-hidden="true">
        <div className="profile-invoice-list">
            {Array.from({ length: 4 }).map((_, index) => (
                <div key={`profile-invoice-item-skeleton-${index}`} className="profile-invoice-item profile-invoice-item-skeleton">
                    <div className="profile-skeleton-content">
                        <span className="profile-skeleton-line profile-skeleton-line-medium" />
                        <span className="profile-skeleton-line profile-skeleton-line-short" />
                    </div>
                    <div className="profile-invoice-actions">
                        <span className="profile-invoice-skeleton-badge" />
                        <span className="profile-invoice-skeleton-button" />
                    </div>
                </div>
            ))}
        </div>

        <div className="profile-invoice-pagination profile-invoices-skeleton-pagination">
            <span className="profile-skeleton-circle" />
            <span className="profile-skeleton-line profile-skeleton-line-medium" />
            <span className="profile-skeleton-circle" />
        </div>
    </div>
);

export default function ProfileInvoicesPage() {
    const router = useRouter();
    const lang = useLocale();
    const intlMessages = useRouteMessages();
    const billingDisabled = isBillingDisabledInCurrentEnv();
    const [invoices, setInvoices] = useState<BillingHistoryEntry[]>([]);
    const [coverage, setCoverage] = useState<BillingHistoryCoverage[]>([]);
    const [pagination, setPagination] = useState<InvoicePagination | null>(null);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        if (billingDisabled) {
            router.replace(localizePath(lang, "/profile"));
            return;
        }

        let cancelled = false;
        const loadInvoices = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const response = await paymentService.listBillingHistory({
                    page,
                    limit: PAGE_SIZE,
                });
                if (cancelled) {
                    return;
                }
                setInvoices(response.entries || []);
                setPagination(response.pagination ?? null);
                setCoverage(response.coverage ?? []);
            } catch (error) {
                if (cancelled) return;
                setLoadError(
                    getLocalizedErrorMessage(error, intlMessages) ||
                        intlMessages.profilePages.invoices.toastLoadError
                );
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        loadInvoices();
        return () => {
            cancelled = true;
        };
    }, [billingDisabled, intlMessages, lang, page, retry, router]);

    if (billingDisabled) {
        return null;
    }

    const totalPages = Math.max(pagination?.totalPages ?? 1, 1);
    const canPrev = page > 1;
    const canNext = page < totalPages;

    return (
        <ProfileShell
            title={intlMessages.profileNav.invoices.title}
            subtitle={intlMessages.profilePages.invoices.subtitle}
            backHref="/profile"
            variant="mobile"
        >
            <div className="profile-card">
                <div className="profile-subscription-panel-header">
                    <div>
                        <p className="profile-panel-label">{intlMessages.profilePages.invoices.label}</p>
                        <h3 className="profile-subscription-panel-title">
                            {intlMessages.profilePages.invoices.headline}
                        </h3>
                    </div>
                </div>

                {isLoading ? (
                    <InvoicesSkeleton />
                ) : loadError ? (
                    <div role="alert">
                        <p className="profile-card-text">{loadError}</p>
                        <Button variant="outline" onClick={() => setRetry(value => value + 1)}>
                            {intlMessages.billingFeedback.retry}
                        </Button>
                    </div>
                ) : invoices.length === 0 ? (
                    <p className="profile-card-text">{intlMessages.profilePages.invoices.empty}</p>
                ) : (
                    <div className="profile-invoice-list">
                        {invoices.map((invoice) => {
                            const badgeClass = statusClasses[invoice.status.toLowerCase()] ?? "is-muted";
                            const amountLabel = invoice.amount === null || invoice.amount === undefined
                                ? intlMessages.profilePages.invoices.amountUnavailable
                                : `${invoice.amount} ${invoice.amountCurrency ?? ""}`.trim();
                            const providerLabel = invoice.provider === "APP_STORE"
                                ? intlMessages.profilePages.invoices.providers.apple
                                : invoice.provider === "GOOGLE_PLAY"
                                    ? intlMessages.profilePages.invoices.providers.google
                                    : intlMessages.profilePages.invoices.providers.confirmo;
                            const providerHistoryUrl = invoice.provider === "APP_STORE"
                                ? "https://reportaproblem.apple.com/"
                                : invoice.provider === "GOOGLE_PLAY"
                                    ? "https://payments.google.com/"
                                    : null;
                            return (
                                <div key={invoice.id} className="profile-invoice-item">
                                    <div>
                                        <p className="profile-invoice-title">
                                            {invoice.productName || intlMessages.profilePages.invoices.invoiceFallback}
                                        </p>
                                        <p className="profile-invoice-meta">
                                            {providerLabel}{invoice.environment === "SANDBOX" ? ` • ${intlMessages.profilePages.invoices.sandboxLabel}` : ""} • {amountLabel} • {formatDate(invoice.paidAt || invoice.occurredAt, lang)}
                                        </p>
                                        <details className="profile-billing-history-details">
                                            <summary>{intlMessages.profilePages.invoices.viewDetails}</summary>
                                            {invoice.providerReference && <p>{intlMessages.profilePages.invoices.paymentReference}: {invoice.providerReference}</p>}
                                            {(invoice.periodStart || invoice.periodEnd) && (
                                                <p>{intlMessages.profilePages.invoices.billingPeriod}: {formatDate(invoice.periodStart, lang)} – {formatDate(invoice.periodEnd, lang)}</p>
                                            )}
                                            {invoice.refundedAmount && (
                                                <p>{intlMessages.profilePages.invoices.refunded}: {invoice.refundedAmount} {invoice.refundedAsset ?? ""}</p>
                                            )}
                                        </details>
                                    </div>
                                    <div className="profile-invoice-actions">
                                        <span className={`profile-badge ${badgeClass}`}>
                                            {formatInvoiceStatusLabel(invoice.status, intlMessages.billingFeedback.invoiceStatuses)}
                                        </span>
                                        {invoice.document.receiptAvailable && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="profile-button profile-button-outline"
                                                onClick={async () => {
                                                    try {
                                                        const blob = await paymentService.downloadBillingReceipt(invoice.id);
                                                        const url = URL.createObjectURL(blob);
                                                        const anchor = document.createElement("a");
                                                        anchor.href = url;
                                                        anchor.download = `${invoice.document.receiptNumber || "tragram-payment-receipt"}.pdf`;
                                                        anchor.click();
                                                        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                                                    } catch {
                                                        toast.error(intlMessages.profilePages.invoices.toastReceiptDownloadError);
                                                    }
                                                }}
                                            >
                                                {intlMessages.profilePages.invoices.downloadReceipt}
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {invoice.document.providerInvoiceUrl && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="profile-button profile-button-outline"
                                                onClick={() =>
                                                    window.open(invoice.document.providerInvoiceUrl!, "_blank", "noopener,noreferrer")
                                                }
                                            >
                                                {intlMessages.profilePages.invoices.viewInvoice}
                                                <ExternalLink className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {providerHistoryUrl && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="profile-button profile-button-outline"
                                                onClick={() => window.open(providerHistoryUrl, "_blank", "noopener,noreferrer")}
                                            >
                                                {providerLabel} {intlMessages.profilePages.invoices.openHistory}
                                                <ExternalLink className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {!isLoading && !loadError && coverage.some((item) => item.status !== "available") && (
                    <p className="profile-card-text" role="status">
                        {intlMessages.profilePages.invoices.historyMayBeIncomplete}
                    </p>
                )}

                {!isLoading && !loadError && (
                    <div className="profile-invoice-pagination">
                        <Button
                            variant="outline"
                            size="sm"
                            className="profile-button profile-button-outline"
                            disabled={!canPrev}
                            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="profile-invoice-page">
                            {intlMessages.profilePages.invoices.pageLabel
                                .replace("{page}", String(page))
                                .replace("{total}", String(totalPages))}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="profile-button profile-button-outline"
                            disabled={!canNext}
                            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </ProfileShell>
    );
}
