"use client";

import { useState } from "react";

import { copyToClipboard } from "./clipboard";
import { cx } from "./cx";
import { Icon } from "./icons";

/** Read-only code sample with a Copy button. If the browser blocks the clipboard the button says so instead of failing silently. */
export function CodeBlock({
  code,
  label,
  onCopied,
  onAttempt,
  className,
}: {
  code: string;
  label: string;
  /** Called only when the clipboard write succeeded. */
  onCopied?: () => void;
  /** Called on every press of Copy, even if the browser blocked the clipboard (the user can still select the text by hand). */
  onAttempt?: () => void;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "blocked">("idle");

  async function copy() {
    onAttempt?.();
    const ok = await copyToClipboard(code);
    setState(ok ? "copied" : "blocked");
    if (ok) onCopied?.();
    setTimeout(() => setState("idle"), 2200);
  }

  return (
    <div className={cx("relative rounded-lg border border-white/10 bg-[#0b1b2b] text-[#d7e6f0]", className)}>
      <pre tabIndex={0} aria-label={label} className="overflow-x-auto p-4 pr-24 font-mono text-[12.5px] leading-relaxed">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        className="absolute right-3 top-3 inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white hover:bg-white/20"
      >
        <Icon name={state === "copied" ? "check" : "copy"} size={14} />
        {state === "copied" ? "Copied" : state === "blocked" ? "Select and copy" : "Copy"}
      </button>
    </div>
  );
}
