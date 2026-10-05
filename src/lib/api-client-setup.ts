import { AxiosHeaders } from "axios";
import type { AxiosRequestHeaders, InternalAxiosRequestConfig } from "axios";

import { client } from "@/lib/api-client/client.gen";
import { AuthTokens, postApiAuthRefresh } from "@/lib/api-client";
import { defaultLocale, getLocaleFromPathname } from "@/lib/i18n";
import { isPublicAuthPath } from "@/lib/api-client-paths";

const DEFAULT_API_BASE_URL = "http://localhost:3000";
const DEVICE_FINGERPRINT_KEY = "tragramDeviceFingerprint";
const normalizeBaseUrl = (value: string): string => value.replace(/\/api\/?$/, "");
const normalizePath = (value: string): string => value.replace(/\/+$/, "") || "/";

const isLocalhost = (hostname: string): boolean =>
  hostname === "localhost" || hostname === "127.0.0.1";

const resolveApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    const meta = document.querySelector('meta[name="tragram-api-url"]');
    const metaValue = meta?.getAttribute("content")?.trim();
    if (metaValue) {
      return normalizeBaseUrl(metaValue);
    }
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    return normalizeBaseUrl(envUrl);
  }

  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    return isLocalhost(hostname) ? DEFAULT_API_BASE_URL : origin;
  }

  return DEFAULT_API_BASE_URL;
};

const getDeviceFingerprint = (): string | null => {
  if (typeof window === "undefined") return null;

  const existing = window.localStorage.getItem(DEVICE_FINGERPRINT_KEY);
  if (existing) return existing;

  const generated =
    typeof window.crypto !== "undefined" && "randomUUID" in window.crypto
      ? window.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

  window.localStorage.setItem(DEVICE_FINGERPRINT_KEY, generated);
  return generated;
};

const getActiveLocale = (): string => {
  if (typeof window === "undefined") return defaultLocale;
  return getLocaleFromPathname(window.location.pathname) ?? defaultLocale;
};

const getRequestPath = (url: string): string => {
  if (typeof window === "undefined") return normalizePath(url.split("?")[0] || "/");
  try {
    return normalizePath(new URL(url, window.location.origin).pathname);
  } catch {
    return normalizePath(url.split("?")[0] || "/");
  }
};

const isAuthPagePath = (path: string): boolean =>
  /(^\/[a-z]{2})?\/auth(\/|$)/.test(normalizePath(path));

const hasHeader = (
  headers: InternalAxiosRequestConfig["headers"] | undefined,
  name: string
): boolean => {
  if (!headers) return false;
  if ("has" in headers && typeof headers.has === "function") {
    return headers.has(name);
  }
  return Object.keys(headers).some((key) => key.toLowerCase() === name.toLowerCase());
};

const setHeader = (
    headers: InternalAxiosRequestConfig["headers"] | undefined,
    name: string,
    value: string
): AxiosRequestHeaders => {
    if (headers && "set" in headers && typeof headers.set === "function") {
        headers.set(name, value);
        return headers as AxiosRequestHeaders;
    }

    const nextHeaders = new AxiosHeaders(headers as AxiosRequestHeaders | undefined);
    nextHeaders.set(name, value);
    return nextHeaders as AxiosRequestHeaders;
};

let initialized = false;
let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  if (typeof window === "undefined") return null;
  const refreshToken = window.localStorage.getItem("refreshToken");
  if (!refreshToken) return null;

  const response = await postApiAuthRefresh({
    body: { refreshToken },
    throwOnError: true,
  });
  type RefreshTokensResponse = {
    tokens?: AuthTokens;
  };
  const tokens = (response.data as RefreshTokensResponse).tokens;
  const accessToken = tokens?.accessToken;
  const nextRefreshToken = tokens?.refreshToken;
  if (!accessToken) return null;

  window.localStorage.setItem("accessToken", accessToken);
  if (nextRefreshToken) {
    window.localStorage.setItem("refreshToken", nextRefreshToken);
  }
  return accessToken;
};

export const initApiClient = () => {
  const resolvedBaseUrl = resolveApiBaseUrl();
  if (initialized) {
    if (typeof window !== "undefined") {
      const currentBaseUrl = client.getConfig().baseURL;
      if (currentBaseUrl !== resolvedBaseUrl) {
        client.setConfig({
          baseURL: resolvedBaseUrl,
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
        });
      }
    }
    return client;
  }
  initialized = true;

  client.setConfig({
    baseURL: resolvedBaseUrl,
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: true,
    auth: () => {
      if (typeof window === "undefined") return undefined;
      return window.localStorage.getItem("accessToken") ?? undefined;
    },
  });

  client.instance.interceptors.request.use((config) => {
    if (typeof window === "undefined") return config;

    const token = window.localStorage.getItem("accessToken");
    if (token && !hasHeader(config.headers, "Authorization")) {
      config.headers = setHeader(config.headers, "Authorization", `Bearer ${token}`);
    }

    const fingerprint = getDeviceFingerprint();
    if (fingerprint && !hasHeader(config.headers, "X-Device-Fingerprint")) {
      config.headers = setHeader(
        config.headers,
        "X-Device-Fingerprint",
        fingerprint
      );
    }

    if (!hasHeader(config.headers, "Accept-Language")) {
      config.headers = setHeader(
        config.headers,
        "Accept-Language",
        getActiveLocale()
      );
    }

    return config;
  });

  client.instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (typeof window === "undefined") {
        return Promise.reject(error);
      }

      const originalRequest = error.config as (InternalAxiosRequestConfig & {
        _retry?: boolean;
      });

      const status = error.response?.status;
      const url = originalRequest?.url ?? "";
      const requestPath = getRequestPath(url);
      const hasAuthHeader = hasHeader(originalRequest?.headers, "Authorization");
      const shouldSkipRefresh =
        status !== 401 ||
        originalRequest?._retry ||
        requestPath === "/api/auth/refresh" ||
        !hasAuthHeader ||
        isPublicAuthPath(requestPath);

      if (shouldSkipRefresh) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }

        const accessToken = await refreshPromise;
        if (!accessToken) {
          throw new Error("Missing refresh token");
        }

        originalRequest.headers = setHeader(
          originalRequest.headers,
          "Authorization",
          `Bearer ${accessToken}`
        );

        return client.instance(originalRequest);
      } catch (refreshError) {
        window.localStorage.removeItem("accessToken");
        window.localStorage.removeItem("refreshToken");
        if (!isAuthPagePath(window.location.pathname)) {
          const locale = getActiveLocale();
          window.location.href = `/${locale}/auth/login`;
        }
        return Promise.reject(refreshError);
      }
    }
  );

  return client;
};
