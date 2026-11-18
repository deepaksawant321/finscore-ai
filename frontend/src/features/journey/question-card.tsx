"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import { cx } from "@/design-system/cx";
import { Button, Card } from "@/design-system/ui";
import { parseMoney, showInr } from "@/features/quick-score/logic";

import { chipSubmitsAtOnce } from "./logic";
import type { JourneyCard } from "./logic";

export type Submit = { value: string; mix?: string | null } | { keep: true } | { skip: true };

function Pill({ selected, onClick, children, disabled }: { selected?: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        "min-h-[48px] min-w-[64px] rounded-2xl border-2 px-5 text-base font-semibold transition motion-safe:active:scale-95",
        selected ? "border-brand bg-brand text-white" : "border-line bg-surface hover:border-brand",
        disabled && "opacity-50",
      )}
    >
      {children}
    </button>
  );
}

function shown(card: JourneyCard, v: string): string {
  if (card.kind === "money") return showInr(Number(v));
  if (card.kind === "bool") return v === "true" ? "Yes" : "No";
  return v;
}

/** One question. Tapping a chip answers it at once; typed amounts go through the same shorthand as the quick score. */
export function QuestionCard({ card, busy, onSubmit }: { card: JourneyCard; busy: boolean; onSubmit: (s: Submit) => void }) {
  const [text, setText] = useState("");
  const [amount, setAmount] = useState<string | null>(null); // savings card: chosen total, waiting for the mix
  const money = card.kind === "money" || card.kind === "savings_mix";
  const parsed = money ? parseMoney(text) : null;
  const typedOk = money ? parsed !== null : /^\d{1,3}$/.test(text.trim());

  const send = (value: string) => {
    if (card.kind === "savings_mix" && value !== "0") return setAmount(value);
    onSubmit({ value });
  };

  return (
    <Card className="space-y-5 motion-safe:animate-[fadein_.25s_ease-out]">
      <div className="space-y-2">
        <p className="font-display text-2xl font-bold leading-snug">{card.prompt}</p>
        <p className="text-sm text-muted">{card.why}</p>
        {card.per_month && <p className="text-xs text-muted">Per month. I&apos;ll work out the yearly figure.</p>}
      </div>

      {card.assumed_value && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-line p-3">
          <span className="text-sm">
            I assumed <strong>{shown(card, card.assumed_value)}</strong>.
          </span>
          <Button onClick={() => onSubmit({ keep: true })} loading={busy}>
            Keep it
          </Button>
          <span className="text-xs text-muted">or pick your own below</span>
        </div>
      )}

      {amount === null && (
        <div className="flex flex-wrap gap-2">
          {card.kind === "bool" && (
            <>
              <Pill onClick={() => onSubmit({ value: "true" })} disabled={busy}>
                Yes
              </Pill>
              <Pill onClick={() => onSubmit({ value: "false" })} disabled={busy}>
                No
              </Pill>
            </>
          )}
          {card.kind === "choice" &&
            card.choices.map((c) => (
              <Pill key={c} onClick={() => onSubmit({ value: c })} disabled={busy}>
                {c[0]?.toUpperCase() + c.slice(1)}
              </Pill>
            ))}
          {card.chips.map((c) => (
            <Pill key={c.label} onClick={() => (chipSubmitsAtOnce(card, c.value) ? send(c.value) : setAmount(c.value))} disabled={busy}>
              {c.label}
            </Pill>
          ))}
        </div>
      )}

      {amount === null && (money || card.kind === "int") && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (typedOk) send(money ? String(parsed) : text.trim());
          }}
        >
          <input
            aria-label={`Your answer: ${card.prompt}`}
            inputMode={money ? "decimal" : "numeric"}
            placeholder={money ? "or type, e.g. 1.5L" : "or type a number"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[48px] w-48 rounded-xl border border-line bg-surface px-3"
          />
          <Button type="submit" disabled={!typedOk} loading={busy}>
            Next
          </Button>
          {money && text && <span className="text-sm text-muted">{parsed === null ? "Try 1.5L, 50k or 150000" : showInr(parsed)}</span>}
        </form>
      )}

      {amount !== null && (
        <div className="space-y-3">
          <p className="text-sm">
            <strong>{showInr(Number(amount))}</strong>. How is it mostly invested?{" "}
            <button type="button" className="text-xs text-muted underline" onClick={() => setAmount(null)}>
              change amount
            </button>
          </p>
          <div className="flex flex-wrap gap-2">
            {card.mixes.map((m) => (
              <Pill key={m.key} onClick={() => onSubmit({ value: amount, mix: m.key })} disabled={busy}>
                {m.label}
              </Pill>
            ))}
          </div>
        </div>
      )}

      {card.unsure_ok && !card.assumed_value && (
        <button type="button" className="text-sm text-muted underline-offset-2 hover:underline" onClick={() => onSubmit({ skip: true })}>
          Not sure, ask me later
        </button>
      )}
    </Card>
  );
}
