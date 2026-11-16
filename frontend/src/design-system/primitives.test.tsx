import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { copyToClipboard } from "./clipboard";
import { Badge, Button, Card, CodeBlock, ProgressBar, SegmentedTabs, SourceBadge, Switch, ToastProvider, buttonClass, sourceFromApi, useToast } from "./ui";

afterEach(() => vi.restoreAllMocks());

describe("Switch", () => {
  it("is a named switch that reports its state and toggles on click and Space", async () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="AI Wealth Coach" />);
    const sw = screen.getByRole("switch", { name: "AI Wealth Coach" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    await userEvent.click(sw);
    expect(onChange).toHaveBeenLastCalledWith(true);
    sw.focus();
    await userEvent.keyboard(" ");
    expect(onChange).toHaveBeenCalledTimes(2);
  });
  it("does nothing when disabled", async () => {
    const onChange = vi.fn();
    render(<Switch checked label="Locked" onChange={onChange} disabled />);
    await userEvent.click(screen.getByRole("switch"));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("SegmentedTabs", () => {
  function Demo() {
    const [v, setV] = useState("a");
    return (
      <SegmentedTabs
        ariaLabel="Method"
        value={v}
        onChange={setV}
        items={[
          { id: "a", label: "Embed" },
          { id: "b", label: "API" },
          { id: "c", label: "SDK" },
        ]}
      />
    );
  }
  it("moves selection with arrow keys, wraps, and keeps one tab in the tab order", async () => {
    render(<Demo />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.getAttribute("aria-selected"))).toEqual(["true", "false", "false"]);
    expect(tabs.map((t) => t.tabIndex)).toEqual([0, -1, -1]);
    tabs[0]?.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "API" })).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "SDK" })).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Embed" })).toHaveAttribute("aria-selected", "true");
  });
});

describe("CodeBlock and clipboard", () => {
  it("copies and confirms", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const onCopied = vi.fn();
    render(<CodeBlock code="npm i @finscore/react" label="Install" onCopied={onCopied} />);
    await userEvent.click(screen.getByRole("button", { name: /copy/i }));
    expect(writeText).toHaveBeenCalledWith("npm i @finscore/react");
    expect(onCopied).toHaveBeenCalled();
    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });
  it("tells the user to copy by hand when the clipboard is blocked", async () => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockRejectedValue(new Error("blocked")) }, configurable: true });
    document.execCommand = vi.fn().mockReturnValue(false);
    expect(await copyToClipboard("x")).toBe(false);
    const onAttempt = vi.fn();
    const onCopied = vi.fn();
    render(<CodeBlock code="x" label="Sample" onAttempt={onAttempt} onCopied={onCopied} />);
    await userEvent.click(screen.getByRole("button", { name: /copy/i }));
    expect(await screen.findByText("Select and copy")).toBeInTheDocument();
    expect(onAttempt).toHaveBeenCalledTimes(1); // pressing Copy counts even when the clipboard is blocked
    expect(onCopied).not.toHaveBeenCalled();
  });
});

describe("Toast", () => {
  it("announces a message through a polite live region", async () => {
    function Trigger() {
      const toast = useToast();
      return <button onClick={() => toast("Saved")}>go</button>;
    }
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByText("go"));
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });
});

describe("variants", () => {
  it("Button variants differ and Link-style classes share them", () => {
    expect(buttonClass("primary")).toContain("bg-brand-gradient");
    expect(buttonClass("ai")).toContain("bg-ai-gradient");
    expect(buttonClass("secondary", "sm")).toContain("min-h-[36px]");
    render(<Button variant="ai">Ask</Button>);
    expect(screen.getByRole("button", { name: "Ask" }).className).toContain("bg-ai-gradient");
  });
  it("Card variants", () => {
    const { container } = render(
      <>
        <Card variant="dark">a</Card>
        <Card variant="solid">b</Card>
      </>,
    );
    const [a, b] = Array.from(container.querySelectorAll("section"));
    expect(a?.className).toContain("card-dark");
    expect(b?.className).toContain("bg-surface");
  });
  it("Badge tones render", () => {
    render(
      <>
        <Badge tone="ai">ai</Badge>
        <Badge tone="negative">neg</Badge>
        <Badge tone="brand">brand</Badge>
      </>,
    );
    expect(screen.getByText("neg").className).toContain("text-negative");
    expect(screen.getByText("brand").className).toContain("text-brand-strong");
  });
  it("ProgressBar is only a progressbar when labelled and clamps", () => {
    const { rerender } = render(<ProgressBar value={140} label="Setup" />);
    expect(screen.getByRole("progressbar", { name: "Setup" })).toHaveAttribute("aria-valuenow", "100");
    rerender(<ProgressBar value={40} />);
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
  it("SourceBadge always has text and maps API provenance", () => {
    render(<SourceBadge source="connected" />);
    expect(screen.getByText("Connected account")).toBeInTheDocument();
    expect(sourceFromApi("bank_feed")).toBe("connected");
    expect(sourceFromApi("CONNECTED")).toBe("connected");
    expect(sourceFromApi("DERIVED")).toBe("derived");
    expect(sourceFromApi("USER_STATED")).toBe("user");
    expect(sourceFromApi("ESTIMATED")).toBe("estimated");
    expect(sourceFromApi("inferred_by_ai")).toBe("inferred");
    expect(sourceFromApi(undefined)).toBe("user");
  });
});
