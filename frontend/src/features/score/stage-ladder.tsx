import { cx } from "@/design-system/cx";

/** The eight stages from the product deck (slide 4), lowest to highest. Names come from the demo rulebook `score.stages`. */
export const STAGES = ["Dependency", "Survival", "Security", "Stability", "Accumulation", "Independence", "Freedom", "Abundance"] as const;

/** Eight-step ladder with the user's current stage marked. If the stage name is unknown nothing is marked as current. */
export function StageLadder({ stage, provisional }: { stage: string; provisional?: boolean }) {
  const current = STAGES.findIndex((s) => s.toLowerCase() === stage.toLowerCase());
  const label = current >= 0 ? `Stage ${current + 1} of 8: ${STAGES[current]}${provisional ? " (provisional)" : ""}` : "Stage not announced yet";
  return (
    <div>
      <div role="img" aria-label={label} className="grid grid-cols-8 gap-1">
        {STAGES.map((s, i) => (
          <i key={s} className={cx("h-2 rounded", i < current ? "bg-brand" : i === current ? "bg-ai ring-[3px] ring-ai/25" : "bg-surface-2")} />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted" aria-hidden="true">
        <span>{STAGES[0]}</span>
        {current > 0 && current < STAGES.length - 1 ? <span className="font-semibold text-ai">{STAGES[current]}</span> : null}
        <span>{STAGES[STAGES.length - 1]}</span>
      </div>
    </div>
  );
}
