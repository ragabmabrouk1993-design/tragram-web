const nonIndexableHostnames = new Set(["staging.tragram.app"]);

export const stagingRobotsBody = "User-agent: *\nDisallow: /\n";
export const stagingRobotsHeaderValue = "noindex, nofollow, noarchive";

export function normalizeRequestHostname(hostHeader: string | null): string {
  const firstHost = hostHeader?.split(",", 1)[0]?.trim().toLowerCase() ?? "";

  if (firstHost.startsWith("[")) {
    const closingBracket = firstHost.indexOf("]");
    return closingBracket >= 0
      ? firstHost.slice(1, closingBracket)
      : firstHost;
  }

  return firstHost.split(":", 1)[0] ?? "";
}

export function isNonIndexableHostname(hostHeader: string | null): boolean {
  return nonIndexableHostnames.has(normalizeRequestHostname(hostHeader));
}
