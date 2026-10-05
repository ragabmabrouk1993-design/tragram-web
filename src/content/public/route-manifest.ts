/** Route identities only: safe to import from request middleware. */
export type PublicPageIdentity = {
  path: string;
  kind: 'main' | 'landing' | 'article';
  requiresBilling: boolean;
};

export const publicRouteManifest: readonly PublicPageIdentity[] = [
  {"path":"/","kind":"main","requiresBilling":false},
  {"path":"/features","kind":"main","requiresBilling":false},
  {"path":"/pricing","kind":"main","requiresBilling":true},
  {"path":"/faqs","kind":"main","requiresBilling":false},
  {"path":"/blog","kind":"main","requiresBilling":false},
  {"path":"/about","kind":"main","requiresBilling":false},
  {"path":"/contact","kind":"main","requiresBilling":false},
  {"path":"/help-center","kind":"main","requiresBilling":false},
  {"path":"/privacy-policy","kind":"main","requiresBilling":false},
  {"path":"/refund-policy","kind":"main","requiresBilling":false},
  {"path":"/terms-of-service","kind":"main","requiresBilling":false},
  {"path":"/account-deletion","kind":"main","requiresBilling":false},
  {"path":"/telegram-signal-copier","kind":"landing","requiresBilling":false},
  {"path":"/best-telegram-signal-copier","kind":"landing","requiresBilling":false},
  {"path":"/telegram-to-mt4-copier","kind":"landing","requiresBilling":false},
  {"path":"/telegram-to-mt5-copier","kind":"landing","requiresBilling":false},
  {"path":"/telegram-signals-automation","kind":"landing","requiresBilling":false},
  {"path":"/telegram-signal-parser","kind":"landing","requiresBilling":false},
  {"path":"/risk-controls","kind":"landing","requiresBilling":false},
  {"path":"/copy-trading-without-vps","kind":"landing","requiresBilling":false},
  {"path":"/prop-firm-telegram-copier","kind":"landing","requiresBilling":false},
  {"path":"/blog/what-is-a-telegram-signal-copier","kind":"article","requiresBilling":false},
  {"path":"/blog/telegram-to-mt5-copier-setup","kind":"article","requiresBilling":false},
  {"path":"/blog/telegram-to-mt4-copier-guide","kind":"article","requiresBilling":false},
  {"path":"/blog/cloud-vs-vps-telegram-copier","kind":"article","requiresBilling":false},
  {"path":"/blog/telegram-signal-parser-guide","kind":"article","requiresBilling":false},
  {"path":"/blog/copy-telegram-signals-with-risk-controls","kind":"article","requiresBilling":false},
  {"path":"/blog/low-latency-telegram-trade-copier","kind":"article","requiresBilling":false},
  {"path":"/blog/telegram-signal-updates-close-sl-tp","kind":"article","requiresBilling":false},
  {"path":"/blog/multi-account-telegram-copier-checklist","kind":"article","requiresBilling":false},
  {"path":"/blog/broker-symbol-mapping-telegram-signals","kind":"article","requiresBilling":false},
  {"path":"/blog/telegram-pending-orders-mt4-mt5","kind":"article","requiresBilling":false},
  {"path":"/blog/telegram-to-mt4-mt5-copier-troubleshooting","kind":"article","requiresBilling":false},
  {"path":"/blog/telegram-copier-supported-platforms","kind":"article","requiresBilling":false},
  {"path":"/blog/copy-telegram-signals-from-phone","kind":"article","requiresBilling":false},
];
