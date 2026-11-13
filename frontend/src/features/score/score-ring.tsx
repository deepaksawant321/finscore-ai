const MIN = 300;
const MAX = 900;

/** 300–900 gauge. Display only: the value is whatever the backend engine returned. */
export function ScoreRing({ value, stage, provisional, early }: { value: number; stage: string; provisional: boolean; early?: boolean }) {
  const pct = Math.max(0, Math.min(1, (value - MIN) / (MAX - MIN)));
  const r = 80;
  const c = 2 * Math.PI * r;
  const arc = c * 0.75; // 270° gauge
  return (
    <figure className="relative mx-auto w-56" aria-label={`FinScore ${Math.round(value)} out of 900, ${early ? "early estimate" : `stage ${stage}`}`}>
      <svg viewBox="0 0 200 200" className="w-full -rotate-[225deg]" role="img" aria-hidden="true">
        <circle cx="100" cy="100" r={r} fill="none" stroke="rgb(var(--line))" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${arc} ${c}`} />
        <circle
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke="rgb(var(--brand))"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${arc * pct} ${c}`}
          style={{ transition: "stroke-dasharray 600ms ease-out" }}
        />
      </svg>
      <figcaption className="absolute inset-0 grid place-content-center text-center">
        <span className="text-5xl font-bold tabular-nums">{Math.round(value)}</span>
        <span className="text-xs text-muted">out of 900</span>
        <span className="mt-1 text-sm font-semibold">
          {early ? <span className="text-warn">Early estimate</span> : stage}
          {!early && provisional ? <span className="font-normal text-muted"> (provisional)</span> : null}
        </span>
      </figcaption>
    </figure>
  );
}
