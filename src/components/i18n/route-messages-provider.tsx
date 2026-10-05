"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { Dictionary } from "@/lib/i18n";

const RouteMessagesContext = createContext<Dictionary | null>(null);

type RouteMessagesProviderProps = {
  children: ReactNode;
  messages: Dictionary;
};

export function RouteMessagesProvider({
  children,
  messages,
}: RouteMessagesProviderProps) {
  return (
    <RouteMessagesContext.Provider value={messages}>
      {children}
    </RouteMessagesContext.Provider>
  );
}

export function useRouteMessages(): Dictionary {
  const context = useContext(RouteMessagesContext);

  if (!context) {
    throw new Error("useRouteMessages must be used within RouteMessagesProvider");
  }

  return context;
}
