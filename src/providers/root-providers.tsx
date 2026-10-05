"use client";

import { ReactNode, useEffect } from "react";
import { Provider } from "react-redux";
import { makeStore } from "@/store";
import { useAppDispatch } from "@/store/hooks";
import { setTheme } from "@/store/uiSlice";
import { authService } from "@/services/auth.service";
import { clearAuth, normalizeUserForStore, setStatus, setTokens, setUser } from "@/store/authSlice";
import { CrispChat } from "@/components/support/crisp-chat";
import { FingerprintProvider } from "@fingerprint/react";
import { AnalyticsProvider } from "@/providers/analytics-provider";

const store = makeStore();
const LOCAL_AUTH_RETRY_DELAY_MS = 1500;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getErrorResponse = (
  error: unknown
): { status?: number; data?: Record<string, unknown> } | null => {
  if (!isObject(error)) return null;
  const response = error.response;
  if (!isObject(response)) return null;
  const status = typeof response.status === "number" ? response.status : undefined;
  const data = isObject(response.data) ? response.data : undefined;
  return { status, data };
};

const isLocalDevHost = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
};

const isAuthFailure = (error: unknown): boolean => {
  const response = getErrorResponse(error);
  const status = response?.status;
  if (status === 401 || status === 403) return true;
  const code = response?.data?.code;
  return typeof code === "string" && code.startsWith("AUTH_");
};

function ThemeApplier({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (typeof window === "undefined") return;
    dispatch(setTheme("dark"));
    document.documentElement.dataset.theme = "dark";
  }, [dispatch]);

  return <>{children}</>;
}

function AuthHydrator({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");

    if (!accessToken || !refreshToken) {
      dispatch(clearAuth());
      return;
    }

    dispatch(setTokens({ accessToken, refreshToken }));
    dispatch(setStatus("checking"));

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const cleanupAuth = () => {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      dispatch(clearAuth());
    };

    const hydrateProfile = async () => {
      try {
        const user = await authService.getProfile();
        if (cancelled) return;

        const serializable = normalizeUserForStore(user);
        if (serializable) {
          dispatch(setUser(serializable));
          return;
        }

        cleanupAuth();
      } catch (error) {
        if (cancelled) return;

        if (isAuthFailure(error)) {
          cleanupAuth();
          return;
        }

        if (isLocalDevHost()) {
          retryTimer = setTimeout(hydrateProfile, LOCAL_AUTH_RETRY_DELAY_MS);
          return;
        }

        cleanupAuth();
      }
    };

    void hydrateProfile();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [dispatch]);

  return <>{children}</>;
}

export default function RootProviders({ children }: { children: ReactNode }) {
  const fingerprintApiKey = process.env.NEXT_PUBLIC_FINGERPRINT_PUBLIC_API_KEY?.trim();
  const fingerprintEnabled = process.env.NEXT_PUBLIC_TRIAL_FINGERPRINT_ENABLED?.trim().toLowerCase() === "true";
  const configuredRegion = process.env.NEXT_PUBLIC_FINGERPRINT_REGION?.trim().toLowerCase();
  const fingerprintEndpoint = process.env.NEXT_PUBLIC_FINGERPRINT_ENDPOINT?.trim();
  const fingerprintRegion = configuredRegion === "eu" || configuredRegion === "ap" || configuredRegion === "us"
    ? configuredRegion
    : "eu";
  const content = (
    <Provider store={store}>
      <ThemeApplier>
        <AuthHydrator>
          {children}
          <AnalyticsProvider />
          <CrispChat />
        </AuthHydrator>
      </ThemeApplier>
    </Provider>
  );

  if (!fingerprintEnabled || !fingerprintApiKey) return content;
  return (
    <FingerprintProvider
      apiKey={fingerprintApiKey}
      region={fingerprintRegion}
      {...(fingerprintEndpoint ? { endpoints: fingerprintEndpoint } : {})}
    >
      {content}
    </FingerprintProvider>
  );
}

// Re-exported for compatibility with existing imports.
export { toggleTheme, setTheme } from "@/store/uiSlice";
