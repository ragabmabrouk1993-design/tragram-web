import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { isBillingDisabledInServerEnv } from "@/lib/runtime-environment";

export default function InvoicesLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (isBillingDisabledInServerEnv()) {
    notFound();
  }

  return children;
}
