"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { initCursor } from "../runtime/init-cursor";
import { shouldDisablePublicVisualRuntime } from "@/lib/public-route-runtime";

export function PublicCursor() {
  const pathname = usePathname();
  const runtimeDisabled = shouldDisablePublicVisualRuntime(pathname ?? "/");

  useEffect(() => {
    if (runtimeDisabled) {
      return undefined;
    }

    return initCursor();
  }, [runtimeDisabled]);

  return null;
}
