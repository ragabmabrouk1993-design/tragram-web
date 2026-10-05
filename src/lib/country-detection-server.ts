import type { CountryCode } from "libphonenumber-js";
import { BlockList, isIP } from "node:net";
import { getApiAuthCountry } from "@/lib/api-client";
import {
  normalizeCountryAccessPolicy,
  type CountryAccessPolicy,
} from "@/lib/restricted-countries";

const FORWARDED_HEADER_KEYS = [
  "x-forwarded-for",
  "x-real-ip",
  "cf-connecting-ip",
  "true-client-ip",
  "x-forwarded-country",
  "accept-language",
] as const;

const privateIpBlockList = new BlockList();

const addPrivateSubnets = () => {
  const ipv4Subnets: Array<[string, number]> = [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.0.2.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["198.51.100.0", 24],
    ["203.0.113.0", 24],
    ["224.0.0.0", 4],
    ["240.0.0.0", 4],
  ];
  const ipv6Subnets: Array<[string, number]> = [
    ["::", 128],
    ["::1", 128],
    ["fc00::", 7],
    ["fe80::", 10],
    ["ff00::", 8],
    ["2001:db8::", 32],
  ];

  for (const [address, prefix] of ipv4Subnets) {
    privateIpBlockList.addSubnet(address, prefix, "ipv4");
  }
  for (const [address, prefix] of ipv6Subnets) {
    privateIpBlockList.addSubnet(address, prefix, "ipv6");
  }
};

addPrivateSubnets();

const normalizeIp = (raw?: string | null): string | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withoutBrackets =
    trimmed.startsWith("[") && trimmed.endsWith("]") ? trimmed.slice(1, -1) : trimmed;
  const withoutZone = withoutBrackets.split("%")[0];

  if (withoutZone.startsWith("::ffff:")) {
    const mapped = withoutZone.slice("::ffff:".length);
    if (isIP(mapped) === 4) {
      return mapped;
    }
  }

  if (isIP(withoutZone)) {
    return withoutZone;
  }

  const bracketWithPortMatch = /^\[([^\]]+)]:(\d+)$/.exec(trimmed);
  if (bracketWithPortMatch && isIP(bracketWithPortMatch[1])) {
    return bracketWithPortMatch[1];
  }

  const pieces = withoutZone.split(":");
  if (pieces.length === 2 && isIP(pieces[0]) === 4) {
    return pieces[0];
  }

  return null;
};

const isPublicIp = (ip: string): boolean => {
  const family = isIP(ip);
  if (!family) return false;
  return !privateIpBlockList.check(ip, family === 4 ? "ipv4" : "ipv6");
};

const parseForwardedList = (raw?: string | null): string[] => {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((part) => normalizeIp(part))
    .filter((ip): ip is string => Boolean(ip));
};

const findPublicIp = (ips: string[]): string | null => {
  for (const ip of ips) {
    if (isPublicIp(ip)) {
      return ip;
    }
  }
  return null;
};

const resolveClientIp = (requestHeaders: HeadersLike): string | null => {
  const directCandidates = ["x-client-ip", "cf-connecting-ip", "true-client-ip", "x-real-ip"];

  for (const key of directCandidates) {
    const ip = normalizeIp(requestHeaders.get(key));
    if (ip && isPublicIp(ip)) {
      return ip;
    }
  }

  const forwardedIp = findPublicIp(parseForwardedList(requestHeaders.get("x-forwarded-for")));
  if (forwardedIp) {
    return forwardedIp;
  }

  return null;
};

const normalizeApiBaseUrl = (value: string): string => value.replace(/\/api\/?$/, "");

const resolveApiBaseUrl = (): string => {
  const publicApiUrl = process.env.PUBLIC_API_URL?.trim();
  if (publicApiUrl) {
    return normalizeApiBaseUrl(publicApiUrl);
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envUrl) {
    return normalizeApiBaseUrl(envUrl);
  }

  return "http://localhost:3000";
};

type HeadersLike = Pick<Headers, "get">;

const buildForwardHeaders = (requestHeaders: HeadersLike): Record<string, string> => {
  const headers: Record<string, string> = {};

  for (const key of FORWARDED_HEADER_KEYS) {
    const value = requestHeaders.get(key);
    if (value?.trim()) {
      headers[key] = value;
    }
  }

  const resolvedClientIp = resolveClientIp(requestHeaders);
  if (resolvedClientIp) {
    headers["x-client-ip"] = resolvedClientIp;
    headers["x-forwarded-for"] = resolvedClientIp;
  }

  return headers;
};

export const getCountryAccessServer = async (
  requestHeaders: HeadersLike
): Promise<CountryAccessPolicy> => {
  const apiBaseUrl = resolveApiBaseUrl();

  try {
    const response = await getApiAuthCountry({
      baseURL: apiBaseUrl,
      headers: buildForwardHeaders(requestHeaders),
      throwOnError: true,
      timeout: 5_000,
    });

    return normalizeCountryAccessPolicy(response.data);
  } catch {
    return normalizeCountryAccessPolicy(null);
  }
};

export const getDetectedCountryServer = async (
  requestHeaders: HeadersLike
): Promise<CountryCode | null> => {
  const policy = await getCountryAccessServer(requestHeaders);
  return policy.countryCode;
};
