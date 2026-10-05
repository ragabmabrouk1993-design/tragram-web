"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { ArrowLeft, CheckCircle2, Clock3, Copy, DollarSign, MessageCircle, Wallet, XCircle } from "lucide-react";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { localizePath, type Locale } from "@/lib/i18n";
import { getLocalizedErrorMessage } from "@/lib/error-utils";
import { formatReferralAmount } from "@/lib/referral-currency";
import {
    referralsService,
    type ReferralPayoutMethod,
    type ReferralPayoutNetwork,
    type ReferralSummary,
    type ReferralWithdrawalOptions,
    type ReferralWithdrawalRequest,
} from "@/services/referrals.service";
import { cn } from "@/lib/utils";
import { resolvePaymentIconSource } from "@/assets/payment-icons/registry";

const pageSizeOptions = [5, 10, 20];

const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
    }).format(date);
};

const summaryFallback: ReferralSummary = {
    code: "",
    referralLink: "",
    stats: {
        totalReferrals: 0,
        activeReferrals: 0,
        paidReferrals: 0,
        pendingEarnings: 0,
        dueEarnings: 0,
        totalEarnings: 0,
        paidEarnings: 0,
        currency: "USD",
    },
    levelStates: [],
    currentLevel: {},
};

function PaymentIcon({
    item,
    className,
}: {
    item?: Pick<ReferralPayoutMethod | ReferralPayoutNetwork, "iconType" | "iconKey" | "iconUrl" | "iconAlt" | "label"> | null;
    className?: string;
}) {
    const src = resolvePaymentIconSource(item ?? undefined);
    if (!src) return null;
    // Admin-configured payout URLs are not all known to next/image remotePatterns.
    // Keep the native element until those hosts and dimensions are explicitly controlled.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={item?.iconAlt || item?.label || ""} className={cn("referrals-payment-icon", className)} loading="lazy" />;
}

function PaginationControls({
    page,
    limit,
    totalPages,
    hasMore,
    onPageChange,
    onLimitChange,
    labels,
}: {
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
    labels: {
        page: string;
        previous: string;
        next: string;
        rowsPerPage: string;
    };
}) {
    const canGoPrevious = page > 1;
    const canGoNext = page < totalPages || hasMore;

    return (
        <div className="referrals-pagination referrals-section-pagination">
            <label className="referrals-limit-control">
                <span>{labels.rowsPerPage}</span>
                <select value={limit} onChange={(event) => onLimitChange(Number(event.target.value))}>
                    {pageSizeOptions.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
            </label>
            <span>{labels.page.replace("{page}", String(page)).replace("{total}", String(totalPages))}</span>
            <div>
                <button type="button" disabled={!canGoPrevious} onClick={() => onPageChange(page - 1)}>
                    {labels.previous}
                </button>
                <button type="button" disabled={!canGoNext} onClick={() => onPageChange(page + 1)}>
                    {labels.next}
                </button>
            </div>
        </div>
    );
}

function WithdrawalModal({
    options,
    onClose,
    onCreated,
}: {
    options: ReferralWithdrawalOptions;
    onClose: () => void;
    onCreated: () => void;
}) {
    const intlMessages = useRouteMessages();
    const copy = intlMessages.profilePages.referrals.withdrawals;
    const eligibleMethods = useMemo(
        () => options.methods.filter((item) => item.isActive && item.isRoleEligible),
        [options.methods]
    );
    const [methodId, setMethodId] = useState(eligibleMethods[0]?.id ?? "");
    const method = eligibleMethods.find((item) => item.id === methodId) ?? eligibleMethods[0] ?? null;
    const activeNetworks = useMemo(
        () => (method?.networks ?? []).filter((network) => network.isActive),
        [method?.networks]
    );
    const [networkId, setNetworkId] = useState(activeNetworks[0]?.id ?? "");
    const network = activeNetworks.find((item) => item.id === networkId) ?? activeNetworks[0] ?? null;
    const [payoutAddress, setPayoutAddress] = useState("");
    const [amountInput, setAmountInput] = useState<string | null>(null);
    const [verificationCode, setVerificationCode] = useState("");
    const [verificationSent, setVerificationSent] = useState(false);
    const [isSendingCode, setIsSendingCode] = useState(false);
    const [userNote, setUserNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const balance = options.availableBalances.find((item) => item.currency === method?.currency);
    const availableAmount = balance?.amount ?? 0;
    const minimumAmount = network?.effectiveMinimumAmount ?? network?.minimumAmount ?? method?.minimumAmount ?? 0;
    const displayedAmountInput = amountInput ?? (availableAmount > 0 ? String(availableAmount) : "");
    const amount = Number(displayedAmountInput);
    const hasAmount = Number.isFinite(amount) && amount > 0;
    const amountMeetsMinimum = hasAmount && amount >= minimumAmount;
    const amountWithinBalance = hasAmount && amount <= availableAmount;
    const recipientLabel = network?.recipientFieldLabel || copy.address;
    const recipientHelp = network?.recipientFieldHelp || network?.instructions || "";
    const recipientPlaceholder = network?.recipientFieldPlaceholder || (network?.code === "ERC20" ? "0x..." : "Enter payout recipient");
    const validationMessage = network?.recipientValidationMessage || "Enter valid payout recipient details.";
    const addressMatches = (() => {
        if (!network?.addressPattern) return true;
        try {
            return new RegExp(network.addressPattern).test(payoutAddress.trim());
        } catch {
            return false;
        }
    })();
    const canSubmit = Boolean(
        network &&
        payoutAddress.trim().length >= 3 &&
        addressMatches &&
        amountMeetsMinimum &&
        amountWithinBalance &&
        verificationCode.trim().length === 6
    );

    const requestVerificationCode = async () => {
        setIsSendingCode(true);
        try {
            const response = await referralsService.requestWithdrawalVerificationCode();
            setVerificationSent(true);
            toast.success(
                response.delivery?.status === "delivery_pending"
                    ? copy.verificationPending
                    : copy.toastVerificationSent
            );
        } catch (error) {
            toast.error(getLocalizedErrorMessage(error, intlMessages) || copy.toastVerificationError);
        } finally {
            setIsSendingCode(false);
        }
    };

    const submit = async () => {
        if (!network || !canSubmit) return;
        setIsSubmitting(true);
        try {
            await referralsService.createWithdrawal({
                payoutNetworkId: network.id,
                payoutAddress: payoutAddress.trim(),
                amount,
                verificationCode: verificationCode.trim(),
                userNote: userNote.trim() || undefined,
            });
            toast.success(copy.toastCreated);
            onCreated();
            onClose();
        } catch (error) {
            toast.error(getLocalizedErrorMessage(error, intlMessages) || copy.toastCreateError);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="referrals-modal-backdrop" onClick={onClose}>
            <div className="referrals-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
                <div className="referrals-modal-heading">
                    <div>
                        <h2>{copy.modalTitle}</h2>
                        <p>{copy.modalSubtitle}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label={copy.cancel}>
                        <XCircle className="h-5 w-5" />
                    </button>
                </div>

                <div className="referrals-withdrawal-form">
                    <label>
                        {copy.method}
                        <select
                            value={methodId}
                            onChange={(event) => {
                                const nextMethodId = event.target.value;
                                const nextMethod = eligibleMethods.find((item) => item.id === nextMethodId);
                                const nextNetwork =
                                    nextMethod?.networks?.find((item) => item.isActive) ?? null;
                                setMethodId(nextMethodId);
                                setNetworkId(nextNetwork?.id ?? "");
                                setAmountInput(null);
                            }}
                        >
                            {eligibleMethods.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        {copy.network}
                        <select value={network?.id ?? ""} onChange={(event) => setNetworkId(event.target.value)}>
                            {activeNetworks.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        {copy.amount}
                        <input
                            type="number"
                            min={minimumAmount || 0}
                            max={availableAmount || undefined}
                            step="0.01"
                            value={displayedAmountInput}
                            onChange={(event) => setAmountInput(event.target.value)}
                            inputMode="decimal"
                        />
                        <small>
                            {copy.available.replace("{amount}", formatReferralAmount(availableAmount))}
                        </small>
                        {hasAmount && !amountMeetsMinimum && (
                            <small className="referrals-field-error">
                                {copy.minimum.replace("{amount}", formatReferralAmount(minimumAmount))}
                            </small>
                        )}
                        {hasAmount && !amountWithinBalance && (
                            <small className="referrals-field-error">
                                {copy.amountTooHigh.replace("{amount}", formatReferralAmount(availableAmount))}
                            </small>
                        )}
                    </label>
                    <label>
                        {copy.verificationCode}
                        <div className="referrals-code-row">
                            <input
                                value={verificationCode}
                                onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder={copy.verificationPlaceholder}
                                inputMode="numeric"
                                autoComplete="one-time-code"
                            />
                            <button
                                type="button"
                                className="referrals-icon-action"
                                onClick={requestVerificationCode}
                                disabled={isSendingCode}
                                title={copy.sendVerification}
                                aria-label={copy.sendVerification}
                            >
                                <MessageCircle className="h-4 w-4" />
                            </button>
                        </div>
                        <small>{verificationSent ? copy.verificationSent : copy.verificationHelp}</small>
                    </label>
                    <label className="referrals-form-wide">
                        {recipientLabel}
                        <input
                            value={payoutAddress}
                            onChange={(event) => setPayoutAddress(event.target.value)}
                            placeholder={recipientPlaceholder}
                        />
                        {recipientHelp && <small>{recipientHelp}</small>}
                        {payoutAddress.trim().length > 0 && !addressMatches && <small className="referrals-field-error">{validationMessage}</small>}
                    </label>
                    <label className="referrals-form-wide">
                        {copy.note}
                        <textarea value={userNote} onChange={(event) => setUserNote(event.target.value)} />
                    </label>
                </div>

                <div className="referrals-withdrawal-confirm">
                    <div className="referrals-payout-route-preview">
                        <PaymentIcon item={method} />
                        <div>
                            <span>{copy.method}</span>
                            <strong>{method?.label ?? "—"}</strong>
                        </div>
                        <PaymentIcon item={network} />
                        <div>
                            <span>{copy.network}</span>
                            <strong>{network?.label ?? "—"}</strong>
                        </div>
                    </div>
                    <div>
                        <span>{copy.amount}</span>
                        <strong>{formatReferralAmount(hasAmount ? amount : 0)}</strong>
                    </div>
                    <p>{copy.minimum.replace("{amount}", formatReferralAmount(minimumAmount))}</p>
                    {(network?.processingTime || network?.feesNote) && (
                        <p>{[network.processingTime, network.feesNote].filter(Boolean).join(" · ")}</p>
                    )}
                </div>

                <div className="referrals-modal-actions">
                    <button type="button" className="referrals-secondary-button" onClick={onClose}>
                        {copy.cancel}
                    </button>
                    <button type="button" className="referrals-share-button" disabled={!canSubmit || isSubmitting} onClick={submit}>
                        {isSubmitting ? "…" : copy.confirm}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ReferralWithdrawalsPage() {
    const params = useParams<{ lang?: Locale }>();
    const lang = params.lang ?? "en";
    const intlMessages = useRouteMessages();
    const copy = intlMessages.profilePages.referrals.withdrawals;
    const [summary, setSummary] = useState<ReferralSummary>(summaryFallback);
    const [options, setOptions] = useState<ReferralWithdrawalOptions | null>(null);
    const [withdrawals, setWithdrawals] = useState<ReferralWithdrawalRequest[]>([]);
    const [detailWithdrawalId, setDetailWithdrawalId] = useState<string | null>(null);
    const [withdrawalPage, setWithdrawalPage] = useState(1);
    const [withdrawalLimit, setWithdrawalLimit] = useState(5);
    const [withdrawalTotalPages, setWithdrawalTotalPages] = useState(1);
    const [withdrawalHasMore, setWithdrawalHasMore] = useState(false);
    const [isSummaryLoading, setIsSummaryLoading] = useState(true);
    const [isWithdrawalsLoading, setIsWithdrawalsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const isLoading = isSummaryLoading || isWithdrawalsLoading;

    const loadSummary = async () => {
        setIsSummaryLoading(true);
        try {
            const [nextSummary, nextOptions] = await Promise.all([
                referralsService.getSummary(),
                referralsService.getWithdrawalOptions(),
            ]);
            setSummary(nextSummary);
            setOptions(nextOptions);
        } catch (error) {
            toast.error(getLocalizedErrorMessage(error, intlMessages) || intlMessages.profilePages.referrals.toastLoadError);
        } finally {
            setIsSummaryLoading(false);
        }
    };

    const loadWithdrawals = async (page = withdrawalPage, limit = withdrawalLimit) => {
        setIsWithdrawalsLoading(true);
        try {
            const nextWithdrawals = await referralsService.listWithdrawals({
                page,
                limit,
                status: "all",
            });
            const items = nextWithdrawals.items ?? [];
            setWithdrawals(items);
            setWithdrawalTotalPages(Math.max(1, nextWithdrawals.pagination?.totalPages ?? 1));
            setWithdrawalHasMore(Boolean(nextWithdrawals.pagination?.hasMore));
            setDetailWithdrawalId((current) => (current && items.some((item) => item.id === current) ? current : null));
        } catch (error) {
            toast.error(getLocalizedErrorMessage(error, intlMessages) || intlMessages.profilePages.referrals.toastLoadError);
        } finally {
            setIsWithdrawalsLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void loadSummary();
        }, 0);
        return () => window.clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void loadWithdrawals();
        }, 0);
        return () => window.clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [withdrawalPage, withdrawalLimit]);

    const detailWithdrawal = withdrawals.find((request) => request.id === detailWithdrawalId) ?? null;
    const primaryBalance = options?.availableBalances[0] ?? { amount: 0, currency: "USD", count: 0 };
    const pendingAmount = summary.stats?.pendingEarnings ?? 0;
    const paidAmount = summary.stats?.paidEarnings ?? 0;
    const totalAmount = summary.stats?.totalEarnings ?? pendingAmount + paidAmount + primaryBalance.amount;
    const disabledReason = options?.disabledReasons[0];
    const disabledText = disabledReason
        ? copy.disabledReasons[disabledReason as keyof typeof copy.disabledReasons] ?? copy.disabledReasons.default
        : "";
    const canRequest = Boolean(options && options.disabledReasons.length === 0);
    const tableCopy = intlMessages.profilePages.referrals.table;
    const paginationLabels = {
        page: copy.page ?? tableCopy.page ?? "Page {page} of {total}",
        previous: copy.previous ?? tableCopy.previous ?? "Previous",
        next: copy.next ?? tableCopy.next ?? "Next",
        rowsPerPage: copy.rowsPerPage ?? "Rows",
    };

    return (
        <main className="referrals-page referrals-withdrawals-page" aria-busy={isLoading}>
            <header className="referrals-header">
                <div>
                    <Link href={localizePath(lang, "/referrals")} className="referrals-back-link">
                        <ArrowLeft className="h-4 w-4" />
                        {copy.back}
                    </Link>
                    <span className="referrals-eyebrow">{intlMessages.profilePages.referrals.eyebrow}</span>
                    <h1>{copy.title}</h1>
                    <p>{copy.subtitle}</p>
                </div>
            </header>

            <section className="referrals-stat-grid referrals-withdrawal-stats">
                <article className="referrals-stat-card">
                    <div className="referrals-stat-icon is-violet"><Wallet className="h-5 w-5" /></div>
                    <p>{copy.total}</p>
                    <strong>{formatReferralAmount(totalAmount)}</strong>
                    <span>{copy.totalHelper}</span>
                </article>
                <article className="referrals-stat-card">
                    <div className="referrals-stat-icon is-green"><DollarSign className="h-5 w-5" /></div>
                    <p>{copy.withdrawable}</p>
                    <strong>{formatReferralAmount(primaryBalance.amount)}</strong>
                    <span>{primaryBalance.count} {copy.commissionPlural}</span>
                    <button type="button" className="referrals-stat-action" disabled={!canRequest} onClick={() => setShowModal(true)}>
                        {copy.requestWithdrawal}
                    </button>
                    {!canRequest && disabledText && <small className="referrals-disabled-note">{disabledText}</small>}
                </article>
                <article className="referrals-stat-card">
                    <div className="referrals-stat-icon is-amber"><Clock3 className="h-5 w-5" /></div>
                    <p>{copy.pending}</p>
                    <strong>{formatReferralAmount(pendingAmount)}</strong>
                    <span>{copy.status.PENDING}</span>
                </article>
                <article className="referrals-stat-card">
                    <div className="referrals-stat-icon is-purple"><CheckCircle2 className="h-5 w-5" /></div>
                    <p>{copy.paid}</p>
                    <strong>{formatReferralAmount(paidAmount)}</strong>
                    <span>{copy.status.PAID}</span>
                </article>
            </section>

            <section className="referrals-withdrawal-grid">
                <article className="referrals-panel">
                    <div className="referrals-panel-heading">
                        <div>
                            <h2>{copy.requests}</h2>
                            <p>{isWithdrawalsLoading ? copy.loading : copy.requestsHelper}</p>
                        </div>
                    </div>
                    <div className="referrals-withdrawal-list">
                        {withdrawals.map((request) => (
                            <button
                                key={request.id}
                                type="button"
                                className={cn("referrals-withdrawal-row", request.id === detailWithdrawal?.id && "is-selected")}
                                onClick={() => setDetailWithdrawalId(request.id)}
                            >
                                <PaymentIcon item={request.payoutMethod} />
                                <div className="referrals-withdrawal-row-main">
                                    <strong>{formatReferralAmount(request.amount)}</strong>
                                    <span>{request.payoutMethod.label} · {request.payoutNetwork.label}</span>
                                    <small>{copy.requestedOn.replace("{date}", formatDate(request.createdAt))}</small>
                                </div>
                                <div className="referrals-withdrawal-row-end">
                                    <span className={cn("referrals-status", `is-${request.status.toLowerCase()}`)}>
                                        {copy.status[request.status]}
                                    </span>
                                    <small>{request.commissionCount} {request.commissionCount === 1 ? copy.commissionSingular : copy.commissionPlural}</small>
                                </div>
                            </button>
                        ))}
                        {!isWithdrawalsLoading && withdrawals.length === 0 && <div className="referrals-empty">{copy.noRequests}</div>}
                    </div>
                    <PaginationControls
                        page={withdrawalPage}
                        limit={withdrawalLimit}
                        totalPages={withdrawalTotalPages}
                        hasMore={withdrawalHasMore}
                        labels={paginationLabels}
                        onPageChange={setWithdrawalPage}
                        onLimitChange={(nextLimit) => {
                            setWithdrawalLimit(nextLimit);
                            setWithdrawalPage(1);
                        }}
                    />
                </article>
            </section>

            {detailWithdrawal && (
                <div className="referrals-modal-backdrop" onClick={() => setDetailWithdrawalId(null)}>
                    <div
                        className="referrals-modal referrals-payout-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="referrals-payout-details-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="referrals-modal-heading">
                            <div>
                                <h2 id="referrals-payout-details-title">{copy.details}</h2>
                                <p>{copy.detailsHelper}</p>
                            </div>
                            <button type="button" onClick={() => setDetailWithdrawalId(null)} aria-label={copy.cancel}>
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="referrals-payout-detail">
                            <div className="referrals-payout-summary">
                                <div className="referrals-payout-summary-main">
                                    <PaymentIcon item={detailWithdrawal.payoutMethod} />
                                    <div>
                                        <span>{copy.amount}</span>
                                        <strong>{formatReferralAmount(detailWithdrawal.amount)}</strong>
                                    </div>
                                </div>
                                <span className={cn("referrals-status", `is-${detailWithdrawal.status.toLowerCase()}`)}>
                                    {copy.status[detailWithdrawal.status]}
                                </span>
                            </div>

                            <dl className="referrals-payout-meta">
                                <div>
                                    <dt>{copy.destination}</dt>
                                    <dd>{detailWithdrawal.payoutMethod.label} · {detailWithdrawal.payoutNetwork.label}</dd>
                                </div>
                                <div>
                                    <dt>{copy.address}</dt>
                                    <dd className="is-copyable">
                                        <span>{detailWithdrawal.payoutAddress}</span>
                                        <button
                                            type="button"
                                            aria-label={copy.copyAddress}
                                            onClick={() => void navigator.clipboard?.writeText(detailWithdrawal.payoutAddress)}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </button>
                                    </dd>
                                </div>
                                <div>
                                    <dt>{copy.requested}</dt>
                                    <dd>{formatDate(detailWithdrawal.createdAt)}</dd>
                                </div>
                                {detailWithdrawal.paidAt && (
                                    <div>
                                        <dt>{copy.paidOn}</dt>
                                        <dd>{formatDate(detailWithdrawal.paidAt)}</dd>
                                    </div>
                                )}
                                {detailWithdrawal.rejectedAt && (
                                    <div>
                                        <dt>{copy.rejectedOn}</dt>
                                        <dd>{formatDate(detailWithdrawal.rejectedAt)}</dd>
                                    </div>
                                )}
                                {(detailWithdrawal.transactionHash || detailWithdrawal.rejectionReason || detailWithdrawal.userNote) && (
                                    <div className="is-wide">
                                        <dt>{detailWithdrawal.transactionHash ? copy.reference : detailWithdrawal.rejectionReason ? copy.reason : copy.note}</dt>
                                        <dd>{detailWithdrawal.transactionHash || detailWithdrawal.rejectionReason || detailWithdrawal.userNote}</dd>
                                    </div>
                                )}
                            </dl>

                            <div className="referrals-included-commissions">
                                <h3>{copy.includedCommissions}</h3>
                                <div className="referrals-included-list">
                                    {detailWithdrawal.commissions.map((commission) => (
                                        <div key={commission.id} className="referrals-included-row">
                                            <div className="referrals-mobile-avatar">
                                                {commission.referredUser.fullName
                                                    .split(" ")
                                                    .map((part) => part[0])
                                                    .join("")
                                                    .slice(0, 2)
                                                    .toUpperCase() || "R"}
                                            </div>
                                            <div className="referrals-mobile-person">
                                                <strong>{commission.referredUser.fullName}</strong>
                                                <span>{commission.invoice?.planName ?? "—"} · {formatDate(commission.createdAt)}</span>
                                            </div>
                                            <div className={cn("referrals-mobile-commission", commission.status === "PENDING" && "is-pending")}>
                                                <strong>{formatReferralAmount(commission.amount)}</strong>
                                                <span>{copy.status[commission.status]}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {detailWithdrawal.commissions.length === 0 && <div className="referrals-empty">{copy.noCommissions}</div>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showModal && options && (
                <WithdrawalModal
                    options={options}
                    onClose={() => setShowModal(false)}
                    onCreated={() => {
                        setWithdrawalPage(1);
                        void loadSummary();
                        void loadWithdrawals(1, withdrawalLimit);
                    }}
                />
            )}
        </main>
    );
}
