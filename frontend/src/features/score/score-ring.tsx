"use client";

import { useEffect, useId, useState } from "react";

const MIN = 300;
const MAX = 900;
const CX = 130;
const CY = 124;
const R = 104;
const START = 135; // degrees; the gauge sweeps 270° clockwise from bottom-left
const SWEEP = 270;

const point = (deg: number) => [CX + R * Math.cos((deg * Math.PI) / 180), CY + R * Math.sin((deg * Math.PI) / 180)] as const;
const arc = (from: number, to: number) => {
  const [x0, y0] = point(from);
  const [x1, y1] = point(to);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 ${to - from > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

/**
 * Score gauge (default 300–900): eight track segments, a gradient arc and a knob at the current value.
 * Display only: the value is whatever the backend engine returned.
 * `min` changes the scale floor (the workbook-based score runs 0–900); `caption` replaces the stage line when a score has no stage.
 */
export function ScoreRing({
  value,
  stage,
  provisional,
  early,
  min = MIN,
  caption,
}: {
  value: number;
  stage: string;
  provisional: boolean;
  early?: boolean;
  min?: number;
  caption?: string;
}) {
  const gid = useId();
  const pct = Math.max(0, Math.min(1, (value - min) / (MAX - min)));
  const length = Math.PI * R * 2 * (SWEEP / 360);
  const target = length * (1 - pct);
  const [offset, setOffset] = useState(length); // starts empty, then animates to the value (CSS transition; disabled under reduced motion)
  useEffect(() => {
    const id = requestAnimationFrame(() => setOffset(target));
    return () => cancelAnimationFrame(id);
  }, [target]);

  const [kx, ky] = point(START + SWEEP * pct);
  const segments = Array.from({ length: 8 }, (_, i) => arc(START + (SWEEP * i) / 8 + 1.2, START + (SWEEP * (i + 1)) / 8 - 1.2));

  return (
    <figure
      className="relative mx-auto w-full max-w-[16.25rem]"
      aria-label={`FinScore ${Math.round(value)} out of 900, ${early ? "early estimate" : (caption ?? `stage ${stage}`)}`}
    >
      <svg viewBox="0 0 260 236" className="block w-full overflow-visible" role="img" aria-hidden="true">
        <defs>
          <linearGradient id={`${gid}-g`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="rgb(var(--brand))" />
            <stop offset="1" stopColor="rgb(var(--ai))" />
          </linearGradient>
        </defs>
        {segments.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="rgb(var(--surface-2))" strokeWidth="14" />
        ))}
        <path
          d={arc(START, START + SWEEP)}
          fill="none"
          stroke={`url(#${gid}-g)`}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1100ms cubic-bezier(.2,.8,.2,1)", filter: "drop-shadow(0 0 8px rgb(var(--brand) / 0.45))" }}
        />
        <circle cx={kx} cy={ky} r="9" fill="rgb(var(--surface))" stroke="rgb(var(--ai))" strokeWidth="4" />
        <text x={point(START)[0] - 4} y={point(START)[1] + 22} fontSize="11" textAnchor="middle" fill="rgb(var(--muted))">
          {min}
        </text>
        <text x={point(START + SWEEP)[0] + 4} y={point(START + SWEEP)[1] + 22} fontSize="11" textAnchor="middle" fill="rgb(var(--muted))">
          {MAX}
        </text>
      </svg>
      <figcaption className="absolute inset-0 grid place-content-center pt-5 text-center">
        <span className="font-display text-6xl font-bold tabular-nums tracking-tight">{Math.round(value)}</span>
        <span className="text-xs text-muted">out of 900</span>
        <span className="mt-1.5 text-sm font-semibold">
          {early ? <span className="text-warn">Early estimate</span> : (caption ?? stage)}
          {!early && !caption && provisional ? <span className="font-normal text-muted"> (provisional)</span> : null}
        </span>
      </figcaption>
    </figure>
  );
}
