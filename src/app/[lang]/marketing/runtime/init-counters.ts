type CounterValue = {
  value: number;
  precision: number;
};

function parseCounterValue(textValue: string): CounterValue | null {
  const normalized = textValue.replace(/,/g, "").trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  if (Number.isNaN(parsed)) {
    return null;
  }

  const decimalPart = normalized.split(".")[1] ?? "";
  return {
    value: parsed,
    precision: decimalPart.length,
  };
}

export function initCounters(): () => void {
  const counterElements = Array.from(document.querySelectorAll<HTMLElement>(".counter"));
  if (counterElements.length === 0) {
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const target = entry.target as HTMLElement;
        if (target.dataset.tgCounterDone === "true") {
          currentObserver.unobserve(target);
          return;
        }

        const parsed = parseCounterValue(target.textContent ?? "");
        if (!parsed) {
          target.dataset.tgCounterDone = "true";
          currentObserver.unobserve(target);
          return;
        }

        const startTime = performance.now();
        const durationMs = 1400;
        const animate = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / durationMs);
          const eased = 1 - Math.pow(1 - progress, 3);
          const currentValue = parsed.value * eased;

          target.textContent =
            parsed.precision > 0
              ? currentValue.toFixed(parsed.precision)
              : Math.round(currentValue).toString();

          if (progress < 1) {
            requestAnimationFrame(animate);
            return;
          }

          target.dataset.tgCounterDone = "true";
          currentObserver.unobserve(target);
        };

        requestAnimationFrame(animate);
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.25 }
  );

  counterElements.forEach((element) => observer.observe(element));

  return () => {
    observer.disconnect();
  };
}
