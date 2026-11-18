import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ThemeProvider, useWorkspaceTheme } from "./theme-provider";

function Probe() {
  const { theme, setTheme, reset } = useWorkspaceTheme();
  return (
    <div>
      <span data-testid="name">{theme.name}</span>
      <button onClick={() => setTheme({ name: "Acme Bank" })}>brand</button>
      <button onClick={reset}>reset</button>
    </div>
  );
}

afterEach(() => localStorage.clear());

describe("ThemeProvider", () => {
  it("never shows a tenant brand left in storage by an older build, and deletes it", () => {
    localStorage.setItem("fs-workspace-theme", JSON.stringify({ name: "Finscore Test", brand: "#E11D48" }));
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("name")).toHaveTextContent("5nance");
    expect(localStorage.getItem("fs-workspace-theme")).toBeNull();
  });

  it("keeps a workspace theme in memory only, so the next visitor on this device gets the default brand", () => {
    const { unmount } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    act(() => screen.getByText("brand").click());
    expect(screen.getByTestId("name")).toHaveTextContent("Acme Bank");
    expect(localStorage.getItem("fs-workspace-theme")).toBeNull();
    act(() => screen.getByText("reset").click());
    expect(screen.getByTestId("name")).toHaveTextContent("5nance");
    unmount();
  });
});
