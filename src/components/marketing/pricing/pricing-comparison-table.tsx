import { Check, Minus } from "lucide-react";
import type { PricingPageModel } from "@/services/payment.service";
import { cn } from "@/lib/utils";

type PricingComparisonTableProps = {
  className?: string;
  title: string;
  subtitle?: string | null;
  featureLabel: string;
  includedLabel: string;
  notIncludedLabel: string;
  notSpecifiedLabel: string;
  plans: PricingPageModel["plans"];
  groups: PricingPageModel["comparison"];
};

const renderComparisonCell = (
  value: string | boolean | number | null | undefined,
  includedLabel: string,
  notIncludedLabel: string,
  notSpecifiedLabel: string
) => {
  if (value === true) {
    return (
      <span className="!text-sky-100 inline-flex items-center gap-2 text-sm font-medium" aria-label={includedLabel}>
        <Check className="h-4 w-4 text-sky-300" aria-hidden="true" />
        <span>{includedLabel}</span>
      </span>
    );
  }

  if (value === false) {
    return (
      <span className="!text-white/60 inline-flex items-center gap-2 text-sm" aria-label={notIncludedLabel}>
        <Minus className="h-4 w-4" aria-hidden="true" />
        <span>{notIncludedLabel}</span>
      </span>
    );
  }

  if (value == null) return <span className="!text-white/60 text-sm">{notSpecifiedLabel}</span>;
  return <span className="!text-white text-sm font-semibold tabular-nums">{String(value)}</span>;
};

export function PricingComparisonTable({
  className,
  title,
  subtitle,
  featureLabel,
  includedLabel,
  notIncludedLabel,
  notSpecifiedLabel,
  plans,
  groups,
}: PricingComparisonTableProps) {
  if (groups.length === 0 || plans.length === 0) return null;

  return (
    <section className={cn("rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,12,22,0.96),rgba(10,16,30,0.92))] px-4 py-4 shadow-[0_24px_80px_rgba(3,8,20,0.28)] md:px-6 md:py-5", className)}>
      <div className="max-w-3xl">
        <h2 className="!text-sky-200 !text-sm !leading-5 font-semibold uppercase tracking-[0.16em]">{title}</h2>
        {subtitle ? <p className="!text-white/70 mt-3 text-sm leading-6 md:text-base">{subtitle}</p> : null}
      </div>

      <div className="mt-4 space-y-3 md:hidden">
        {groups.map((group) => (
          <section key={group.name} aria-label={group.name}>
            <h3 className="!text-sky-200 !text-xs !leading-4 !mb-0 border-b border-white/10 pb-2 font-semibold uppercase tracking-[0.12em]">
              {group.name}
            </h3>
            <div className="divide-y divide-white/[0.07]">
              {group.rows.map((row) => (
                <div key={row.code} className="py-2">
                  <h4 className="!text-white !text-sm !leading-5 !mt-0 !mb-0 font-medium">{row.label}</h4>
                  <dl className="mt-1.5 grid gap-1">
                    {plans.map((plan) => (
                      <div key={`${row.code}-${plan.code}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                        <dt className="!text-white/70 text-xs">{plan.name}</dt>
                        <dd className="text-end">
                          {renderComparisonCell(row.values[plan.code], includedLabel, notIncludedLabel, notSpecifiedLabel)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[680px] table-fixed border-collapse text-start">
          <caption className="sr-only">{title}</caption>
          <colgroup>
            <col className="w-[34%]" />
            {plans.map((plan) => <col key={plan.code} />)}
          </colgroup>
          <thead>
            <tr className="border-b border-white/12">
              <th scope="col" className="!text-white/70 px-3 py-3 text-start text-xs font-semibold uppercase tracking-[0.12em]">
                {featureLabel}
              </th>
              {plans.map((plan) => (
                <th key={plan.code} scope="col" className="!text-white px-3 py-3 text-start text-sm font-semibold">
                  <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>{plan.name}</span>
                    {plan.recommended ? <span className="rounded-full border border-sky-400/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-100">{plan.recommendedBadge ?? "Featured"}</span> : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          {groups.map((group) => (
            <tbody key={group.name}>
              <tr>
                <th scope="rowgroup" colSpan={plans.length + 1} className="!text-sky-200 !text-xs !leading-4 border-b border-white/[0.07] px-3 pb-2 pt-3 text-start font-semibold uppercase tracking-[0.12em]">
                  {group.name}
                </th>
              </tr>
              {group.rows.map((row) => (
                <tr key={row.code} className="border-b border-white/[0.055] last:border-0">
                  <th scope="row" className="!text-white/80 !text-[13px] !leading-5 px-3 py-2 text-start font-medium">{row.label}</th>
                  {plans.map((plan) => (
                    <td key={`${row.code}-${plan.code}`} className="px-3 py-2 text-start">
                      {renderComparisonCell(row.values[plan.code], includedLabel, notIncludedLabel, notSpecifiedLabel)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  );
}
