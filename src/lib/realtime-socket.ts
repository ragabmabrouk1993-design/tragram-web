import { io, type Socket } from "socket.io-client";

const DEFAULT_API_BASE_URL = "http://localhost:3000";

const normalizeBaseUrl = (value: string): string => value.replace(/\/api\/?$/, "");

export const resolveSocketBaseUrl = (): string => {
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
    return window.location.origin;
  }

  return DEFAULT_API_BASE_URL;
};

export const createRealtimeSocket = (): Socket =>
  io(resolveSocketBaseUrl(), {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    rememberUpgrade: true,
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.5,
    timeout: 15000,
    auth: { token: "" },
  });
