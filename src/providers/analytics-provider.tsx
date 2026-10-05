"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import type { AnalyticsRuntimeConfig } from "@/lib/analytics/config";
import { disableAnalytics, enableAnalytics, trackAnalyticsEvent, updateAnalyticsIdentity } from "@/lib/analytics/client";

type ConsentChoice = "granted" | "denied";
type StoredConsent = { version: string; choice: ConsentChoice; decidedAt: string };
const CONSENT_STORAGE_KEY = "tragram.analytics-consent.v1";

function readConsent(version: string): StoredConsent | null {
  try {
    const value = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as StoredConsent;
    return parsed.version === version && (parsed.choice === "granted" || parsed.choice === "denied") ? parsed : null;
  } catch {
    return null;
  }
}

export function AnalyticsProvider() {
  const locale = useLocale();
  const pathname = usePathname();
  const userId = useAppSelector((state) => state.auth.user?.id ?? null);
  const [config, setConfig] = useState<AnalyticsRuntimeConfig | null>(null);
  const [consent, setConsent] = useState<StoredConsent | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const previousScreen = useRef<string | undefined>(undefined);
  const rtl = locale === "ar";

  useEffect(() => {
    let active = true;
    let lastRefreshAt = 0;
    let inFlight = false;
    const refresh = async (force = false) => {
      if (!active || inFlight || (!force && Date.now() - lastRefreshAt < 60_000)) return;
      inFlight = true;
      lastRefreshAt = Date.now();
      try {
        const response = await fetch("/api/analytics-config", { cache: "no-store", credentials: "same-origin" });
        if (!response.ok) throw new Error("Analytics config unavailable");
        const value = await response.json() as AnalyticsRuntimeConfig & { allowedOrigins?: string[] };
        if (!active) return;
        const originAllowed = value.allowedOrigins?.includes(window.location.origin) === true;
        const nextConfig = { ...value, enabled: value.enabled && originAllowed };
        setConfig(nextConfig);
        setConsent(nextConfig.enabled && nextConfig.consentPolicyVersion !== "unconfigured"
          ? readConsent(nextConfig.consentPolicyVersion)
          : null);
      } catch {
        if (active) {
          setConfig(null);
          setConsent(null);
          disableAnalytics();
        }
      } finally {
        inFlight = false;
      }
    };
    void refresh(true);
    const onFocus = () => void refresh(true);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh(true);
    };
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 60_000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pathname]);

  useEffect(() => {
    const openPreferences = () => setShowSettings(true);
    window.addEventListener("tragram:analytics-open-preferences", openPreferences);
    return () => window.removeEventListener("tragram:analytics-open-preferences", openPreferences);
  }, []);

  const saveChoice = useCallback((choice: ConsentChoice) => {
    if (!config) return;
    const stored: StoredConsent = {
      version: config.consentPolicyVersion,
      choice,
      decidedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stored));
    } catch {
      if (choice === "granted") return;
    }
    setConsent(stored);
    setShowSettings(false);
  }, [config]);

  useEffect(() => {
    if (!config?.enabled || consent?.choice !== "granted") {
      disableAnalytics();
      return;
    }
    updateAnalyticsIdentity(userId);
    void enableAnalytics(config, userId);
  }, [config, consent, userId]);

  useEffect(() => {
    if (!config?.enabled || consent?.choice !== "granted" || !pathname) {
      if (consent?.choice !== "granted") previousScreen.current = undefined;
      return;
    }
    const path = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), "") || "/";
    const screenByPath: Record<string, string> = {
      "/onboarding": "onboarding",
      "/auth/signup": "signup",
      "/auth/login": "login",
      "/channels": "channels",
      "/profile": "profile",
      "/profile/subscription": "subscription",
      "/pricing": "pricing",
      "/faqs": "faqs",
      "/profile/contact": "contact",
      "/dashboard": "dashboard",
    };
    screenByPath["/auth/forgot-password"] = "forgot_password";
    let screenName = screenByPath[path];
    if (!screenName && /^\/channels\/[^/]+\/settings$/.test(path)) screenName = "channel_settings";
    if (!screenName) return;
    const previous = previousScreen.current;
    if (previous === screenName) return;
    if (screenName === "onboarding") {
      trackAnalyticsEvent("onboarding_viewed");
      trackAnalyticsEvent("onboarding_slide_viewed", { slide_index: 0 });
    }
    if (screenName === "signup") trackAnalyticsEvent("signup_started");
    if (screenName === "forgot_password") trackAnalyticsEvent("forgot_password_started");
    if (screenName === "pricing") trackAnalyticsEvent("paywall_viewed", { source: "other" });
    if (screenName === "subscription") {
      trackAnalyticsEvent("paywall_viewed", { source: "my_subscription" });
      trackAnalyticsEvent("my_subscription_viewed");
    }
    trackAnalyticsEvent("screen_viewed", {
      screen_name: screenName,
      ...(previous ? { previous_screen: previous } : {}),
    });
    previousScreen.current = screenName;
  }, [config, consent, locale, pathname]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if ((event.key !== CONSENT_STORAGE_KEY && event.key !== null) || !config) return;
      const next = readConsent(config.consentPolicyVersion);
      setConsent(next);
      if (next?.choice !== "granted") disableAnalytics();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [config]);

  if (!config?.enabled) return null;

  const panelStyle: CSSProperties = {
    position: "fixed", zIndex: 10000, insetInline: 16, bottom: 16, marginInline: "auto", maxWidth: 640,
    padding: 20, borderRadius: 16, border: "1px solid rgba(255,255,255,.18)", background: "#111827",
    color: "#fff", boxShadow: "0 16px 48px rgba(0,0,0,.38)", direction: rtl ? "rtl" : "ltr",
  };
  const buttonStyle: CSSProperties = {
    minHeight: 42, borderRadius: 10, padding: "9px 15px", border: "1px solid rgba(255,255,255,.25)",
    background: "transparent", color: "inherit", cursor: "pointer",
  };

  return (
    <>
      {consent && !showSettings && (
        <button type="button" onClick={() => setShowSettings(true)} aria-label={rtl ? "إعدادات الخصوصية" : "Analytics privacy settings"}
          style={{ position: "fixed", zIndex: 9999, insetInlineEnd: 14, bottom: 14, ...buttonStyle, background: "#111827" }}>
          {rtl ? "الخصوصية" : "Privacy settings"}
        </button>
      )}
      {(!consent || showSettings) && (
        <section role="dialog" aria-modal="true" aria-labelledby="analytics-consent-title" style={panelStyle}>
          <h2 id="analytics-consent-title" style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>
            {rtl ? "إعدادات التحليلات" : "Analytics preferences"}
          </h2>
          <p style={{ margin: "0 0 16px", color: "#d1d5db", lineHeight: 1.55 }}>
            {rtl
              ? "هل تسمح لنا بجمع بيانات استخدام محدودة لتحسين Tragram؟ يمكنك تغيير اختيارك من إعدادات الخصوصية."
              : "May we collect limited usage data to improve Tragram? You can change this choice later in Privacy settings."}
            {" "}<a href={`/${locale}/privacy-policy`} style={{ color: "#93c5fd", textDecoration: "underline" }}>
              {rtl ? "سياسة الخصوصية" : "Privacy policy"}
            </a>
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" style={buttonStyle} onClick={() => saveChoice("denied")}>
              {rtl ? "رفض التحليلات" : "Reject analytics"}
            </button>
            <button type="button" style={{ ...buttonStyle, borderColor: "#60a5fa", background: "#2563eb" }} onClick={() => saveChoice("granted")}>
              {rtl ? "السماح بالتحليلات" : "Allow analytics"}
            </button>
          </div>
        </section>
      )}
    </>
  );
}
