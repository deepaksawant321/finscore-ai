"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { cx } from "@/design-system/cx";
import { Icon } from "@/design-system/icons";
import { Alert, Badge, Button, Card, buttonClass } from "@/design-system/ui";
import { BADGE_ICON, chapterAction, nodeStates, pct, scoreDelta } from "@/features/journey/logic";
import type { AnswerResult, ChapterInfo, Journey, JourneyCard } from "@/features/journey/logic";
import { QuestionCard } from "@/features/journey/question-card";
import type { Submit } from "@/features/journey/question-card";
import { ScoreRing } from "@/features/score/score-ring";
import { api, problemMessage } from "@/lib/api/client";
import { track } from "@/lib/analytics";

function Meter({ share }: { share: string }) {
  const p = pct(share);
  return (
    <div className="space-y-1" aria-label={`Score measured: ${p}%`}>
      <div className="flex justify-between text-xs font-medium">
        <span>Score measured</span>
        <span className="tabular-nums">{p}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p}>
        <div className="h-3 rounded-full bg-ai-gradient transition-[width] duration-700 ease-out" style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

function Rewards({ j }: { j: Journey }) {
  if (!j.progress) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Badge>✦ {j.progress.points} clarity points</Badge>
      <Badge>
        ◷ {j.progress.active_weeks} active {j.progress.active_weeks === 1 ? "week" : "weeks"}
        {j.progress.active_this_week ? " · this week ✓" : ""}
      </Badge>
      {j.progress.badges.map((b) => (
        <Badge key={b.key} tone="demo">
          {BADGE_ICON[b.key] ?? "•"} {b.label}
        </Badge>
      ))}
    </div>
  );
}

function Confetti() {
  const dots = Array.from({ length: 18 }, (_, i) => i);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden">
      {dots.map((i) => (
        <span
          key={i}
          className="absolute top-0 h-2 w-2 rounded-full animate-[confetti_1.6s_ease-out_forwards]"
          style={{ left: `${(i * 53) % 100}%`, animationDelay: `${(i % 6) * 80}ms`, background: ["#0fb5a6", "#6366f1", "#f59e0b", "#ec4899"][i % 4] }}
        />
      ))}
    </div>
  );
}

function ChapterNode({ c, state, onOpen }: { c: ChapterInfo; state: ReturnType<typeof nodeStates>[number]; onOpen: () => void }) {
  return (
    <li className="relative flex gap-4">
      <div
        className={cx(
          "z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 text-lg font-bold",
          state === "done" && "border-brand bg-brand text-white",
          state === "current" && "border-brand bg-surface text-brand motion-safe:animate-pulse",
          state === "open" && "border-line bg-surface",
          state === "locked" && "border-line bg-surface-2 text-muted",
        )}
      >
        {state === "done" ? <Icon name="check" /> : state === "locked" ? <Icon name="lock" size={18} /> : c.done}
      </div>
      <Card className={cx("mb-4 flex flex-1 flex-wrap items-center justify-between gap-3 !p-4", state === "locked" && "opacity-60")}>
        <div>
          <p className="font-semibold">{c.title}</p>
          <p className="text-sm text-muted">{c.blurb}</p>
          <p className="mt-1 text-xs text-muted tabular-nums">
            {c.done} of {c.total} answered
          </p>
        </div>
        <Button variant={state === "current" ? "primary" : "secondary"} disabled={!c.unlocked} onClick={onOpen}>
          {chapterAction(c)}
        </Button>
      </Card>
    </li>
  );
}

type Play = { chapter: string; card: JourneyCard | null; feedback: AnswerResult | null; done: AnswerResult | null };

export default function MoneyMapPage() {
  const qc = useQueryClient();
  const [skipped, setSkipped] = useState<string[]>([]);
  const [play, setPlay] = useState<Play | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScore, setLastScore] = useState<number | null>(null);

  const journey = useQuery({
    queryKey: ["journey"],
    queryFn: async () => {
      const { data } = await api.GET("/api/v1/journey");
      if (!data) throw new Error("journey failed");
      return data;
    },
  });
  const j = journey.data;

  async function nextCard(chapter: string, skip: string[]): Promise<JourneyCard | null> {
    const { data } = await api.GET("/api/v1/journey", { params: { query: { chapter, skipped: skip.join(",") || undefined } } });
    return data?.next ?? null;
  }

  async function open(chapter: string) {
    setError(null);
    track("journey_start", { chapter });
    setPlay({ chapter, card: await nextCard(chapter, skipped), feedback: null, done: null });
  }

  async function submit(s: Submit) {
    if (!play?.card) return;
    const card = play.card;
    if ("skip" in s) {
      track("journey_skip", { card: card.key });
      const sk = [...skipped, card.key];
      setSkipped(sk);
      setPlay({ ...play, card: await nextCard(play.chapter, sk), feedback: null });
      return;
    }
    setBusy(true);
    setError(null);
    const query = { skipped: skipped.join(",") || undefined };
    const res =
      "keep" in s
        ? await api.POST("/api/v1/journey/keep", { params: { query }, body: { card: card.key } })
        : await api.POST("/api/v1/journey/answer", { params: { query }, body: { card: card.key, value: s.value, mix: (s.mix ?? null) as never } });
    setBusy(false);
    if (!res.data) return setError(problemMessage(res.error));
    const r = res.data;
    track("journey_answer", { card: card.key });
    if (r.chapter_complete) track("chapter_complete", { chapter: play.chapter });
    if (r.score) track("score_revealed", { chapter: play.chapter });
    void qc.invalidateQueries({ queryKey: ["journey"] });
    void qc.invalidateQueries({ queryKey: ["facts"] });
    if (r.score) qc.setQueryData(["matrix-score"], r.score);
    setPlay({ chapter: play.chapter, card: r.next ?? null, feedback: r, done: r.chapter_complete ? r : null });
  }

  async function checkin() {
    const { error: err } = await api.POST("/api/v1/journey/checkin");
    if (err) return setError(problemMessage(err));
    void qc.invalidateQueries({ queryKey: ["journey"] });
  }

  if (journey.isLoading) return <p className="text-muted">Loading…</p>;
  if (!j) return <Alert tone="error">Could not load your Money Map.</Alert>;
  const states = nodeStates(j.chapters);
  const title = (key: string) => j.chapters.find((c) => c.key === key)?.title ?? key;
  const nextChapter = j.chapters.find((c) => c.unlocked && !c.complete && c.key !== play?.chapter);

  // ---------------------------------------------------------------- chapter complete
  if (play?.done) {
    const s = play.done.score;
    return (
      <div className="relative mx-auto max-w-xl space-y-5 pb-24">
        <Confetti />
        <Card className="space-y-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">Chapter complete</p>
          <h1 className="font-display text-3xl font-bold">{title(play.chapter)} ✓</h1>
          {s && (
            <div className="mx-auto w-fit">
              <ScoreRing value={Number(s.overall)} stage="" provisional early={s.early_estimate} min={0} caption="Draft FinScore" />
            </div>
          )}
          {s && lastScore !== null && <p className="text-lg font-semibold tabular-nums">{scoreDelta(lastScore, Number(s.overall))}</p>}
          <Meter share={play.done.measured_after} />
          {play.done.points_awarded !== null && play.done.points_awarded !== undefined && (
            <p className="text-sm">
              <strong>+{play.done.points_awarded}</strong> clarity points
            </p>
          )}
          {play.done.new_badges.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {play.done.new_badges.map((b) => (
                <Badge key={b.key} tone="demo">
                  {BADGE_ICON[b.key] ?? "•"} New badge: {b.label}
                </Badge>
              ))}
            </div>
          )}
          {s?.watermark && <p className="text-xs text-muted">{s.watermark}. Points and badges never change your score.</p>}
          <div className="flex flex-wrap justify-center gap-3">
            {nextChapter && (
              <Button
                onClick={() => {
                  if (s) setLastScore(Number(s.overall));
                  void open(nextChapter.key);
                }}
              >
                Next: {nextChapter.title}
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                if (s) setLastScore(Number(s.overall));
                setPlay(null);
              }}
            >
              Back to map
            </Button>
            <Link href="/app/score" className={buttonClass("ghost", "md")}>
              See the full breakdown
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------- playing a chapter
  if (play) {
    const c = j.chapters.find((x) => x.key === play.chapter);
    return (
      <div className="mx-auto max-w-xl space-y-4 pb-24">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setPlay(null)} aria-label="Back to map" className="rounded-full p-2 hover:bg-surface-2">
            <Icon name="x" />
          </button>
          <div className="flex-1">
            <p className="text-sm font-semibold">{title(play.chapter)}</p>
            {c && (
              <div className="mt-1 h-2 rounded-full bg-line">
                <div className="h-2 rounded-full bg-brand transition-[width] duration-500" style={{ width: `${c.total ? (c.done / c.total) * 100 : 0}%` }} />
              </div>
            )}
          </div>
        </div>
        {play.feedback && (
          <div role="status" className="flex items-start justify-between gap-3 rounded-2xl border border-brand/40 bg-brand/10 p-3 motion-safe:animate-[fadein_.3s_ease-out]">
            <p className="text-sm font-medium">{play.feedback.insight}</p>
            {play.feedback.points_awarded ? <span className="shrink-0 text-sm font-bold text-brand">+{play.feedback.points_awarded}</span> : null}
          </div>
        )}
        {error && <Alert tone="error">{error}</Alert>}
        {play.card ? (
          <QuestionCard key={play.card.key} card={play.card} busy={busy} onSubmit={(s) => void submit(s)} />
        ) : (
          <Card className="space-y-3">
            <p className="font-semibold">That&apos;s all for now in this chapter.</p>
            <p className="text-sm text-muted">The questions you put off will come back next time.</p>
            <Button
              onClick={() => {
                setSkipped([]);
                setPlay(null);
              }}
            >
              Back to map
            </Button>
          </Card>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------- the map
  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-24">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Money Map</h1>
        <p className="text-sm text-muted">
          Short chapters of quick taps. Each answer measures more of your FinScore.{" "}
          <Link href="/app/interview" className="text-ai underline">
            Prefer to talk?
          </Link>
        </p>
        <Meter share={j.measured} />
        <Rewards j={j} />
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {j.checkin_due && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Weekly check-in</p>
            <p className="text-sm text-muted">Anything changed in your money this week?</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => void checkin()}>No change</Button>
            <Link href="/app/memory" className={buttonClass("secondary", "md")}>
              Update numbers
            </Link>
          </div>
        </Card>
      )}
      <ol className="relative before:absolute before:bottom-8 before:left-6 before:top-6 before:w-1 before:-translate-x-1/2 before:rounded before:bg-line">
        {j.chapters.map((c, i) => (
          <ChapterNode key={c.key} c={c} state={states[i] ?? "locked"} onOpen={() => void open(c.key)} />
        ))}
      </ol>
      {j.progress === null && j.rewards_enabled === false && <p className="text-xs text-muted">Points and badges are off. You can turn them on in Settings.</p>}
    </div>
  );
}
