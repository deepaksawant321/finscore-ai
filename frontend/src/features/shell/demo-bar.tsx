"use client";

import { useCurrentScore } from "@/features/score/hooks";

/** Shown only while the backend marks the score as unofficial (it returns a `watermark`). Never hard-coded on. */
export function DemoBar() {
  const score = useCurrentScore();
  const watermark = score.data?.watermark;
  if (!watermark) return null;
  return (
    <div role="status" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-line bg-warn/15 px-4 py-2 text-center text-[12.5px] font-medium text-warn">
      <b>{watermark}</b>
      <span>Demo rules, not an official FinScore. Official scores appear once the Rulebook is approved.</span>
    </div>
  );
}
