import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Callout } from "./Callout";

describe("Callout", () => {
  it("renders the title and body with the tone class", () => {
    render(
      <Callout tone="warn" title="Nothing here">
        poof
      </Callout>
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("poof")).toBeInTheDocument();
    expect(screen.getByText("Nothing here").closest(".callout")).toHaveClass("callout-warn");
  });

  it("uses role=alert for the error tone", () => {
    render(<Callout tone="error" title="Oops">bad</Callout>);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders the title as a level-2 heading", () => {
    render(<Callout tone="warn" title="Nothing here">poof</Callout>);
    expect(
      screen.getByRole("heading", { level: 2, name: /nothing here/i })
    ).toBeInTheDocument();
  });
});
