import type { SVGProps } from "react";

/** Inline stroke icons (24px grid). Decorative by default: pair with visible text or an aria-label on the control. */
const PATHS = {
  home: "M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  chat: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z",
  score: "M4 18a8 8 0 1 1 16 0M12 18l4-6",
  dna: "M7 3c0 6 10 6 10 12s-10 6-10 6M17 3c0 6-10 6-10 12M8 7h8M8 17h8",
  sim: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4M10 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4M18 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4",
  goal: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2",
  act: "m5 12 4 4 10-10",
  mem: "M4 7c0-2 16-2 16 0s-16 2-16 0v10c0 2 16 2 16 0V7M4 12c0 2 16 2 16 0",
  more: "M5 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M12 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M19 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  moon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14M20 20l-3.5-3.5",
  send: "M5 12h14M13 6l6 6-6 6",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
  user: "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8M4 21c0-4 4-6 8-6s8 2 8 6",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  approx: "M4 9c3-3 5 3 8 0s5-3 8 0M4 16c3-3 5 3 8 0s5-3 8 0",
  shield: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z",
  wallet: "M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zM16 13.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2",
  up: "m5 15 7-7 7 7",
  down: "m5 9 7 7 7-7",
  lock: "M7 11h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2zM8 11V8a4 4 0 0 1 8 0v3",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v5l3 2",
  edit: "M4 20h4L19 9l-4-4L4 16z",
  warn: "M12 4 2.5 20h19zM12 10v4M12 17h0",
  x: "M6 6l12 12M18 6 6 18",
  check: "m5 12 4 4 10-10",
  bank: "M3 10 12 4l9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18",
  rocket: "M5 19c0-3 1-5 3-6M14 4c4 0 6 2 6 6-2 4-5 7-9 9l-3-3c2-4 5-7 6-12zM15 7.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M5 15l4 4",
  plug: "M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4",
  palette: "M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.4-2-.6-1 0-2.2 1.3-2.2H17a4 4 0 0 0 4-4C21 6.5 17 3 12 3zM7.5 10a1 1 0 1 0 0 2 1 1 0 0 0 0-2M10 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2M15 6.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2",
  users: "M9 4.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .6 3.5 2.2 3.5 5.2",
  card: "M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M7 15h4",
  copy: "M10 8h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zM16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  staff: "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8M5 20c0-3.5 3-6 7-6s7 2.5 7 6M18 4l2 2-2 2",
  cog: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6M19 12l2 1-1 3-2.2-.4a7 7 0 0 1-1.6 1.6L16.6 20l-3 1-1-2a7 7 0 0 1-2.2 0l-1 2-3-1 .4-2.2a7 7 0 0 1-1.6-1.6L3 16l-1-3 2-1a7 7 0 0 1 0-2.2l-2-1 1-3 2.2.4a7 7 0 0 1 1.6-1.6L7.4 4l3-1 1 2a7 7 0 0 1 2.2 0l1-2 3 1-.4 2.2a7 7 0 0 1 1.6 1.6L21 8l1 3-2 1z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, ...rest }: { name: IconName; size?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
