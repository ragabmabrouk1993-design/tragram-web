const PUBLIC_AUTH_PATHS = new Set([
  "/api/auth/signin",
  "/api/auth/signin/verify",
  "/api/auth/signup",
  "/api/auth/signup/verify",
  "/api/auth/signup/resend",
  "/api/auth/fingerprint-challenge",
  "/api/auth/password-reset/request",
  "/api/auth/password-reset/verify",
  "/api/auth/password-reset/complete",
]);

const normalizePath = (value: string): string => value.replace(/\/+$/, "") || "/";

export const isPublicAuthPath = (path: string): boolean =>
  PUBLIC_AUTH_PATHS.has(normalizePath(path));
