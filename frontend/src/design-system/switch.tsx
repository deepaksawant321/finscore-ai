import { cx } from "./cx";

/** On/off control. Exposes role="switch" with aria-checked; pass `label` (becomes the accessible name). */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative h-[26px] w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        checked ? "bg-brand" : "bg-line",
        className,
      )}
    >
      <span className={cx("absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-white shadow transition-transform", checked && "translate-x-[18px]")} />
    </button>
  );
}
