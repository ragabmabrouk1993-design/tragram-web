const TP_TARGET_PATTERN = /^(TP(10|[1-9])|OPEN)$/i;
const TP_LEVEL_PATTERN = /^TP(10|[1-9])$/i;

const normalizeTpExecutionTargets = (targets: string[]): string[] => {
  const seen = new Set<string>();
  return targets.reduce<string[]>((normalized, item) => {
    const candidate = item.trim().toUpperCase();
    if (!candidate || !TP_TARGET_PATTERN.test(candidate) || seen.has(candidate)) {
      return normalized;
    }
    seen.add(candidate);
    normalized.push(candidate);
    return normalized;
  }, []);
};

const parseTpLevel = (value: string): number | null => {
  const match = value.match(/^TP(\d+)$/i);
  if (!match) return null;
  const level = Number(match[1]);
  return Number.isFinite(level) ? level : null;
};

const buildDefaultCustomPercentages = (keys: string[]): Record<string, string> => {
  const levels = Array.from(
    new Set(keys.map((key) => key.trim().toUpperCase()).filter((key) => TP_LEVEL_PATTERN.test(key)))
  ).sort((a, b) => (parseTpLevel(a) ?? 0) - (parseTpLevel(b) ?? 0));

  if (levels.length === 0) {
    return { TP1: '100' };
  }

  const base = Math.floor(100 / levels.length);
  let remainder = 100 - base * levels.length;
  const result: Record<string, string> = {};
  for (const level of levels) {
    const value = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    result[level] = String(value);
  }
  return result;
};

export const alignCustomPercentagesToTargets = (
  current: Record<string, string>,
  targets: string[]
): Record<string, string> => {
  const selected = normalizeTpExecutionTargets(targets).filter((key) =>
    TP_LEVEL_PATTERN.test(key)
  );
  if (selected.length === 0) {
    return { TP1: '100' };
  }

  const next: Record<string, string> = {};
  for (const key of selected) {
    next[key] = current[key] ?? '0';
  }

  const total = selected.reduce((sum, key) => sum + Number(next[key] || 0), 0);
  if (!Number.isFinite(total) || total <= 0) {
    return buildDefaultCustomPercentages(selected);
  }

  if (Math.abs(total - 100) <= 0.001) {
    return next;
  }

  const scale = 100 / total;
  let running = 0;
  for (let i = 0; i < selected.length; i += 1) {
    const key = selected[i];
    if (i === selected.length - 1) {
      next[key] = String(Math.max(0, Math.round((100 - running) * 100) / 100));
      continue;
    }
    const scaled = Math.max(0, Math.round(Number(next[key] || 0) * scale * 100) / 100);
    next[key] = String(scaled);
    running += scaled;
  }

  return next;
};

export const updateTpPercentageDraft = (
  current: Record<string, string>,
  key: string,
  value: string
): Record<string, string> => ({
  ...current,
  [key]: value,
});
