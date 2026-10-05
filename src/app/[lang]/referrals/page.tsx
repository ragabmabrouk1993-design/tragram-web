"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import {
    CheckCircle2,
    ChevronRight,
    Copy,
    LockKeyhole,
    Share2,
    Trophy,
    Users,
    Wallet,
    Clock3,
    UserCheck,
} from "lucide-react";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import {
    referralsService,
    type ReferralCommissionLevel,
    type ReferralListItem,
    type ReferralStatusFilter,
    type ReferralSummary,
    type ReferralWithdrawalOptions,
} from "@/services/referrals.service";
import { localizePath, type Locale } from "@/lib/i18n";
import { getLocalizedErrorMessage } from "@/lib/error-utils";
import { formatReferralAmount } from "@/lib/referral-currency";
import { cn } from "@/lib/utils";
import { trackAnalyticsEvent } from "@/lib/analytics/client";

const statusFilters: Array<{ key: ReferralStatusFilter; dot?: string }> = [
    { key: "all" },
    { key: "active", dot: "success" },
    { key: "pending", dot: "warning" },
];

const formatDate = (value?: Date | string) => {
    if (!value) return "—";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(date);
};

const formatDateTime = (value?: Date | string | null) => {
    if (!value) return "—";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
};

const getInitials = (name?: string) => {
    const parts = (name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "—";
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
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

type ReferralLevelProgress = NonNullable<ReferralSummary["levelStates"]>[number];
type ReferralLevelState = ReferralCommissionLevel &
    Partial<ReferralLevelProgress> & {
        status?: "completed" | "current" | "locked";
        isCurrent?: boolean;
        isCompleted?: boolean;
        isLocked?: boolean;
        paidReferrals?: number;
        requiredPaidReferrals?: number;
        referralsRemaining?: number;
        progressPercent?: number;
        completedAt?: Date | string | null;
    };

const formatReferralRange = (
    level: ReferralCommissionLevel,
    copy: {
        range: string;
        rangeOpen: string;
    }
) =>
    level.maxPaidReferrals
        ? copy.range
            .replace("{min}", String(level.minPaidReferrals ?? 0))
            .replace("{max}", String(level.maxPaidReferrals))
        : copy.rangeOpen.replace("{min}", String(level.minPaidReferrals ?? 0));

export default function ReferralsPage() {
    const params = useParams<{ lang?: Locale }>();
    const lang = params.lang ?? "en";
    const intlMessages = useRouteMessages();
    const copy = intlMessages.profilePages.referrals;
    const [summary, setSummary] = useState<ReferralSummary>(summaryFallback);
    const [commissionLevels, setCommissionLevels] = useState<ReferralCommissionLevel[]>([]);
    const [withdrawalOptions, setWithdrawalOptions] = useState<ReferralWithdrawalOptions | null>(null);
    const [items, setItems] = useState<ReferralListItem[]>([]);
    const [status, setStatus] = useState<ReferralStatusFilter>("all");
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isTableLoading, setIsTableLoading] = useState(false);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
    const trackedSummary = useRef(false);

    const currentLevel = summary.currentLevel as {
        level?: number;
        ratePercent?: number;
        paidReferrals?: number;
        nextLevelAt?: number | null;
        referralsToNextLevel?: number;
    };
    const paidReferrals = currentLevel.paidReferrals ?? summary.stats?.paidReferrals ?? 0;
    const sortedCommissionLevels = useMemo(
        () => [...commissionLevels].sort((a, b) => (a.level ?? 0) - (b.level ?? 0)),
        [commissionLevels]
    );
    const currentLevelNumber = currentLevel.level ?? sortedCommissionLevels[0]?.level ?? 1;
    const selectedLevelNumber = selectedLevel ?? currentLevelNumber;
    const levelStates = useMemo<ReferralLevelState[]>(() => {
        const states = summary.levelStates ?? [];
        const progressByLevel = new Map(
            states.map((state) => [state.level, state])
        );
        if (sortedCommissionLevels.length === 0) {
            return [...states].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
        }
        return sortedCommissionLevels.map((level) => {
            const levelNumber = level.level ?? 0;
            const progress = progressByLevel.get(levelNumber);
            const requiredPaidReferrals = level.maxPaidReferrals ?? level.minPaidReferrals ?? 0;
            const isCurrent = levelNumber === currentLevelNumber;
            const isCompleted = levelNumber < currentLevelNumber;
            const isLocked = !isCurrent && !isCompleted;
            return {
                ...progress,
                ...level,
                status: isCompleted ? "completed" : isCurrent ? "current" : "locked",
                isCurrent,
                isCompleted,
                isLocked,
                paidReferrals: progress?.paidReferrals ?? paidReferrals,
                requiredPaidReferrals: progress?.requiredPaidReferrals ?? requiredPaidReferrals,
                referralsRemaining: progress?.referralsRemaining ?? Math.max(0, requiredPaidReferrals - paidReferrals),
                progressPercent:
                    progress?.progressPercent ??
                    (requiredPaidReferrals ? Math.min(100, Math.round((paidReferrals / requiredPaidReferrals) * 100)) : 100),
                completedAt: progress?.completedAt ?? null,
            } satisfies ReferralLevelState;
        });
    }, [currentLevelNumber, paidReferrals, sortedCommissionLevels, summary.levelStates]);
    const selectedLevelState =
        levelStates.find((level) => level.level === selectedLevelNumber) ?? levelStates[0] ?? null;
    const selectedRangeText = selectedLevelState
        ? formatReferralRange(selectedLevelState, copy.levels)
        : "";
    const getMobileFilterLabel = (filter: ReferralStatusFilter) => {
        if (filter === "all") return `${copy.filters.all} ${summary.stats?.totalReferrals ?? 0}`;
        return copy.filters[filter];
    };
    const withdrawalDisabledReasons = withdrawalOptions?.disabledReasons ?? [];
    const withdrawalDisabledReason = withdrawalDisabledReasons[0];
    const canRequestWithdrawal = withdrawalDisabledReasons.length === 0;
    const withdrawalHelper = withdrawalDisabledReason
        ? copy.withdrawals.disabledReasons[withdrawalDisabledReason as keyof typeof copy.withdrawals.disabledReasons] ??
        copy.withdrawals.disabledReasons.default
        : copy.withdrawals.requestHelper;

    useEffect(() => {
        let cancelled = false;
        const loadSummary = async () => {
            setIsLoading(true);
            try {
                const [nextSummary, nextLevels, nextWithdrawalOptions] = await Promise.all([
                    referralsService.getSummary(),
                    referralsService.getLevels(),
                    referralsService.getWithdrawalOptions(),
                ]);
                if (!cancelled) {
                    setSummary(nextSummary);
                    setCommissionLevels(nextLevels);
                    setWithdrawalOptions(nextWithdrawalOptions);
                    if (!trackedSummary.current) {
                        trackedSummary.current = true;
                        trackAnalyticsEvent("referrals_viewed", {
                            total_referrals: nextSummary.stats?.totalReferrals ?? 0,
                            paid_referrals: nextSummary.stats?.paidReferrals ?? 0,
                            current_level: Number.isFinite(Number(nextSummary.currentLevel?.level))
                                ? Number(nextSummary.currentLevel?.level)
                                : undefined,
                            total_earnings: nextSummary.stats?.totalEarnings ?? 0,
                        });
                    }
                }
            } catch (error) {
                if (!cancelled) {
                    toast.error(getLocalizedErrorMessage(error, intlMessages) || copy.toastLoadError);
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        void loadSummary();
        return () => {
            cancelled = true;
        };
    }, [copy.toastLoadError, intlMessages]);

    useEffect(() => {
        let cancelled = false;
        const loadReferrals = async () => {
            setIsTableLoading(true);
            try {
                const result = await referralsService.list({ page, limit: 10, status });
                if (!cancelled) {
                    setItems(result.items ?? []);
                    setTotalPages(result.pagination?.totalPages ?? 1);
                }
            } catch (error) {
                if (!cancelled) {
                    toast.error(getLocalizedErrorMessage(error, intlMessages) || copy.toastLoadError);
                }
            } finally {
                if (!cancelled) setIsTableLoading(false);
            }
        };
        void loadReferrals();
        return () => {
            cancelled = true;
        };
    }, [copy.toastLoadError, intlMessages, page, status]);

    const copyLink = async () => {
        const link = summary.referralLink || "";
        if (!link) return;
        await navigator.clipboard.writeText(link);
        trackAnalyticsEvent("referral_link_copied", {});
        toast.success(copy.toastCopied);
    };

    const shareLink = async () => {
        const link = summary.referralLink || "";
        if (!link) return;
        if (navigator.share) {
            await navigator.share({ title: copy.title, url: link });
            trackAnalyticsEvent("referral_link_shared", { share_activity: "web_share" });
            return;
        }
        await copyLink();
    };

    const stats = [
        {
            label: copy.stats.earnings,
            value: formatReferralAmount(summary.stats?.totalEarnings ?? 0),
            helper: copy.stats.earningsHelper.replace("{paid}", formatReferralAmount(summary.stats?.paidEarnings ?? 0)),
            secondaryLabel: copy.stats.paidAmount,
            secondaryValue: formatReferralAmount(summary.stats?.paidEarnings ?? 0),
            icon: Wallet,
            tone: "violet",
            action: "withdrawal",
        },
        {
            label: copy.stats.pending,
            value: formatReferralAmount(summary.stats?.pendingEarnings ?? 0),
            helper: copy.stats.pendingHelper,
            icon: Clock3,
            tone: "amber",
        },
        {
            label: copy.stats.total,
            value: summary.stats?.totalReferrals ?? 0,
            helper: copy.stats.totalHelper,
            icon: Users,
            tone: "purple",
        },
        {
            label: copy.stats.active,
            value: summary.stats?.activeReferrals ?? 0,
            helper: copy.stats.activeHelper,
            icon: UserCheck,
            tone: "green",
        },
    ];

    return (
        <main className="referrals-page" aria-busy={isLoading}>
            <header className="referrals-header">
                <div>
                    <span className="referrals-eyebrow">{copy.eyebrow}</span>
                    <h1>{copy.title}</h1>
                </div>
            </header>

            <section className="referrals-stat-grid">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <article key={stat.label} className="referrals-stat-card">
                            <div className={cn("referrals-stat-icon", `is-${stat.tone}`)}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <p>{stat.label}</p>
                            <strong>{isLoading ? "—" : stat.value}</strong>
                            <span>{stat.helper}</span>
                            {"secondaryLabel" in stat && stat.secondaryLabel && (
                                <div className="referrals-stat-meta">
                                    <span>{stat.secondaryLabel}</span>
                                    <b>{isLoading ? "—" : stat.secondaryValue}</b>
                                </div>
                            )}
                            {stat.action === "withdrawal" && (
                                <>
                                    <Link
                                        href={localizePath(lang, "/referrals/withdrawals")}
                                        className="referrals-stat-action"
                                        title={canRequestWithdrawal ? copy.withdrawals.requestHelper : withdrawalHelper}
                                    >
                                        {canRequestWithdrawal ? copy.withdrawals.requestPayment : copy.withdrawals.viewRequests}
                                    </Link>
                                    {!canRequestWithdrawal && (
                                        <small className="referrals-disabled-note">{withdrawalHelper}</small>
                                    )}
                                </>
                            )}
                        </article>
                    );
                })}
            </section>

            <section className="referrals-grid">
                <article className="referrals-panel referrals-levels">
                    <div className="referrals-panel-heading">
                        <div>
                            <h2>{copy.levels.title}</h2>
                            <p>{copy.levels.subtitle}</p>
                        </div>
                    </div>
                    <div className="referrals-level-board">
                        <div className="referrals-tier-grid" role="tablist" aria-label={copy.levels.title}>
                            {levelStates.map((level) => {
                                const levelNumber = level.level ?? 0;
                                const isCurrent = Boolean(level.isCurrent);
                                const isComplete = Boolean(level.isCompleted);
                                const isSelected = levelNumber === selectedLevelNumber;
                                return (
                                    <button
                                        key={levelNumber}
                                        type="button"
                                        role="tab"
                                        aria-selected={isSelected}
                                        className={cn(
                                            "referrals-tier-cell",
                                            isCurrent && "is-current",
                                            isComplete && "is-complete",
                                            isSelected && !isCurrent && "is-selected"
                                        )}
                                        onClick={() => setSelectedLevel(levelNumber)}
                                    >
                                        <span>{level.name || copy.levels.level.replace("{level}", String(levelNumber))}</span>
                                        <strong>{level.ratePercent ?? 0}%</strong>
                                    </button>
                                );
                            })}
                        </div>

                        {selectedLevelState && (
                            <div
                                className={cn(
                                    "referrals-level-detail-panel",
                                    selectedLevelState.isCurrent && "is-current",
                                    selectedLevelState.isCompleted && "is-complete",
                                    selectedLevelState.isLocked && "is-locked"
                                )}
                            >
                                <div className="referrals-level-detail-copy">
                                    <div>
                                        <strong>
                                            {copy.levels.details.replace(
                                                "{name}",
                                                selectedLevelState.name ||
                                                copy.levels.level.replace("{level}", String(selectedLevelState.level ?? 0))
                                            )}
                                        </strong>
                                        <small>
                                            {copy.levels.requirements.replace("{range}", selectedRangeText)}
                                        </small>
                                    </div>
                                    <span className="referrals-level-rate">
                                        {selectedLevelState.ratePercent ?? 0}%
                                    </span>
                                </div>

                                <div className="referrals-level-detail-status">
                                    {selectedLevelState.isCompleted ? (
                                        <span className="referrals-level-state is-complete">
                                            <CheckCircle2 className="h-4 w-4" />
                                            {copy.levels.fulfilled}
                                        </span>
                                    ) : selectedLevelState.isCurrent ? (
                                        <span className="referrals-level-state is-current">
                                            <Trophy className="h-4 w-4" />
                                            {copy.levels.current
                                                .replace("{level}", String(selectedLevelState.level ?? currentLevelNumber))
                                                .replace("{paid}", String(paidReferrals))}
                                        </span>
                                    ) : (
                                        <span className="referrals-level-state is-locked">
                                            <LockKeyhole className="h-4 w-4" />
                                            {copy.levels.locked}
                                        </span>
                                    )}
                                    <span>
                                        {selectedLevelState.isCompleted
                                            ? copy.levels.completedAt.replace(
                                                "{date}",
                                                formatDateTime(selectedLevelState.completedAt)
                                            )
                                            : selectedLevelState.isCurrent
                                                ? selectedLevelState.maxPaidReferrals
                                                    ? copy.levels.paidProgress
                                                        .replace("{paid}", String(paidReferrals))
                                                        .replace("{max}", String(selectedLevelState.requiredPaidReferrals))
                                                    : copy.levels.maxLevel
                                                : copy.levels.toNext.replace(
                                                    "{count}",
                                                    String(Math.max(0, (selectedLevelState.minPaidReferrals ?? 0) - paidReferrals))
                                                )}
                                    </span>
                                </div>

                                <div className="referrals-mini-progress" aria-hidden="true">
                                    <i style={{ width: `${selectedLevelState.progressPercent ?? 0}%` }} />
                                </div>
                            </div>
                        )}
                    </div>

                </article>

                <article className="referrals-panel referrals-link-card">
                    <div className="referrals-panel-heading">
                        <div>
                            <h2>{copy.link.title}</h2>
                            <p>{summary.referralLink || "—"}</p>
                        </div>
                        <button type="button" className="referrals-icon-button" onClick={copyLink} aria-label={copy.link.copy}>
                            <Copy className="h-5 w-5" />
                        </button>
                    </div>
                    <button type="button" className="referrals-share-button" onClick={shareLink}>
                        <Share2 className="h-5 w-5" />
                        <span>{copy.link.share}</span>
                    </button>
                </article>
            </section>

            <section className="referrals-panel referrals-table-panel">
                <h2 className="referrals-mobile-list-title">{copy.title}</h2>
                <div className="referrals-tabs">
                    {statusFilters.map((filter) => (
                        <button
                            key={filter.key}
                            type="button"
                            className={cn(status === filter.key && "is-active")}
                            onClick={() => {
                                if (status !== filter.key) {
                                    trackAnalyticsEvent("referral_status_tab_changed", { tab: filter.key });
                                }
                                setStatus(filter.key);
                                setPage(1);
                            }}
                        >
                            {filter.dot && <span className={`referrals-dot is-${filter.dot}`} />}
                            <span className="referrals-filter-desktop">{copy.filters[filter.key]}</span>
                            <span className="referrals-filter-mobile">{getMobileFilterLabel(filter.key)}</span>
                        </button>
                    ))}
                </div>

                <div className="referrals-table-wrap">
                    <table className="referrals-table">
                        <thead>
                            <tr>
                                <th>{copy.table.name}</th>
                                <th>{copy.table.plan}</th>
                                <th>{copy.table.commission}</th>
                                <th>{copy.table.status}</th>
                                <th>{copy.table.date}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr key={item.id}>
                                    <td>
                                        <strong>{item.fullName}</strong>
                                        <span>{item.email}</span>
                                    </td>
                                    <td>{item.plan}</td>
                                    <td>{formatReferralAmount(item.commission ?? 0)}</td>
                                    <td>
                                        <span className={cn("referrals-status", `is-${item.status}`)}>
                                            {copy.status[item.status ?? "pending"]}
                                        </span>
                                    </td>
                                    <td>{formatDate(item.attributedAt)}</td>
                                </tr>
                            ))}
                            {!isTableLoading && items.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="referrals-empty">{copy.table.empty}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="referrals-mobile-list">
                    {items.map((item) => {
                        const isPending = item.status === "pending";
                        const commissionText = isPending
                            ? copy.status.pending
                            : `+${formatReferralAmount(item.commission ?? 0)}`;
                        const metaText = isPending
                            ? formatReferralAmount(item.commission ?? 0)
                            : formatDate(item.attributedAt);

                        return (
                            <article key={item.id} className="referrals-mobile-row">
                                <div className="referrals-mobile-avatar">{getInitials(item.fullName)}</div>
                                <div className="referrals-mobile-person">
                                    <strong>{item.fullName}</strong>
                                    <span>{item.plan || item.email}</span>
                                </div>
                                <div className={cn("referrals-mobile-commission", isPending && "is-pending")}>
                                    <strong>{commissionText}</strong>
                                    <span>{metaText}</span>
                                </div>
                                <ChevronRight className="referrals-mobile-chevron h-5 w-5" />
                            </article>
                        );
                    })}
                    {!isTableLoading && items.length === 0 && (
                        <div className="referrals-empty">{copy.table.empty}</div>
                    )}
                </div>

                <div className="referrals-pagination">
                    <span>{copy.table.page.replace("{page}", String(page)).replace("{total}", String(totalPages))}</span>
                    <div>
                        <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
                            {copy.table.previous}
                        </button>
                        <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>
                            {copy.table.next}
                        </button>
                    </div>
                </div>
            </section>
        </main>
    );
}
