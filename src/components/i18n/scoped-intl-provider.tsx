import type { ReactNode } from "react";
import { loadMessages } from "@/i18n/load-messages";
import type { MessageNamespace } from "@/i18n/messages";
import type { Locale } from "@/i18n/routing";
import { RouteMessagesProvider } from "@/components/i18n/route-messages-provider";

type ScopedIntlProviderProps = {
  children: ReactNode;
  locale: Locale;
  namespaces: readonly MessageNamespace[];
};

export async function ScopedIntlProvider({
  children,
  locale,
  namespaces,
}: ScopedIntlProviderProps) {
  const messages = await loadMessages(locale, namespaces);

  return (
    <RouteMessagesProvider messages={messages}>
      {children}
    </RouteMessagesProvider>
  );
}
