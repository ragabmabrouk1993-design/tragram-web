"use client";

import { useEffect, useMemo, useRef } from "react";

type HeroArcProgressProps = {
  value: number;
  label: string;
  size?: number;
  thickness?: number;
  durationMs?: number;
  startAngleRad?: number;
};

const ARC_PATH_LENGTH = 100;

const clampProgress = (value: number) => Math.min(1, Math.max(0, value));

export function HeroArcProgress({
  value,
  label,
  size = 145,
  thickness = 4,
  durationMs = 1400,
  startAngleRad = -1.6,
}: HeroArcProgressProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<SVGCircleElement | null>(null);
  const valueRef = useRef<HTMLSpanElement | null>(null);

  const targetPercent = Math.round(clampProgress(value) * 100);
  const normalizedStrokeWidth = useMemo(() => (thickness / size) * 100, [size, thickness]);
  const normalizedRadius = useMemo(() => 50 - normalizedStrokeWidth / 2, [normalizedStrokeWidth]);
  const startAngleDeg = useMemo(() => (startAngleRad * 180) / Math.PI, [startAngleRad]);

  useEffect(() => {
    const rootNode = rootRef.current;
    const progressNode = progressRef.current;
    const valueNode = valueRef.current;

    if (!rootNode || !progressNode || !valueNode) {
      return undefined;
    }

    let rafId = 0;

    const applyFrame = (percent: number) => {
      progressNode.style.strokeDasharray = `${ARC_PATH_LENGTH}`;
      progressNode.style.strokeDashoffset = `${ARC_PATH_LENGTH - percent}`;
      valueNode.textContent = `${percent}`;
      rootNode.setAttribute("aria-valuenow", `${percent}`);
    };

    applyFrame(0);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      applyFrame(targetPercent);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries, currentObserver) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          currentObserver.unobserve(entry.target);

          const startedAt = performance.now();
          const animate = (now: number) => {
            const elapsed = now - startedAt;
            const progress = Math.min(1, elapsed / durationMs);
            const eased = 1 - Math.pow(1 - progress, 3);
            const nextPercent = Math.round(targetPercent * eased);

            applyFrame(nextPercent);

            if (progress < 1) {
              rafId = requestAnimationFrame(animate);
            }
          };

          rafId = requestAnimationFrame(animate);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.2 }
    );

    observer.observe(rootNode);

    return () => {
      observer.disconnect();
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [durationMs, targetPercent]);

  return (
    <div
      ref={rootRef}
      className="circle circle--arc-progress"
      data-value={value.toFixed(2)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <svg className="circle-ring" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <circle
          className="circle-track"
          cx="50"
          cy="50"
          r={normalizedRadius}
          pathLength={ARC_PATH_LENGTH}
          style={{ strokeWidth: normalizedStrokeWidth }}
        />
        <circle
          ref={progressRef}
          className="circle-progress"
          cx="50"
          cy="50"
          r={normalizedRadius}
          pathLength={ARC_PATH_LENGTH}
          style={{
            strokeWidth: normalizedStrokeWidth,
            transform: `rotate(${startAngleDeg}deg)`,
            transformOrigin: "50% 50%",
          }}
        />
      </svg>
      <div className="progress_value">
        <span ref={valueRef} className="pro_data">
          0
        </span>
        <span>%</span>
        <span className="circle-text">{label}</span>
      </div>
    </div>
  );
}
