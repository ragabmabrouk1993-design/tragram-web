"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type LtrContentProps = {
  as?: "div" | "span";
  children: ReactNode;
  className?: string;
};

export function LtrContent({
  as: Component = "span",
  children,
  className,
}: LtrContentProps) {
  return (
    <Component dir="ltr" className={cn("tragram-ltr-content", className)}>
      {children}
    </Component>
  );
}
