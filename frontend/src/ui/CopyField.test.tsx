import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, it, expect, vi } from "vitest";
import { CopyField } from "./CopyField";

describe("CopyField", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("exposes the full value via an aria-labelled read-only control", () => {
    render(<CopyField label="One-time link" value="https://x/s/1#supersecretkey" />);
    const field = screen.getByLabelText(/one-time link/i);
    expect(field).toHaveDisplayValue("https://x/s/1#supersecretkey");
    expect(field).toHaveAttribute("readonly");
  });

  it("copies the value to the clipboard on click", async () => {
    const user = userEvent.setup();
    render(<CopyField label="One-time link" value="https://x/s/1#k" />);
    await user.click(screen.getByRole("button", { name: /copy/i }));
    expect(await screen.findByRole("button", { name: /copied/i })).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe("https://x/s/1#k");
  });

  it("selects the value and shows a manual hint when the clipboard is blocked", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    render(<CopyField label="One-time link" value="https://x/s/1#k" />);
    await user.click(screen.getByRole("button", { name: /copy/i }));
    expect(await screen.findByText(/select & copy manually/i)).toBeInTheDocument();
  });
});
