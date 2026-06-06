import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Shell } from "./Shell";

describe("Shell", () => {
  it("renders the prompt header and its children", () => {
    render(
      <Shell>
        <p>inner content</p>
      </Shell>
    );
    expect(screen.getByText(/cendre@secure/i)).toBeInTheDocument();
    expect(screen.getByText("inner content")).toBeInTheDocument();
  });

  it("exposes the brand as the page-level h1", () => {
    render(
      <Shell>
        <p>inner content</p>
      </Shell>
    );
    expect(
      screen.getByRole("heading", { level: 1, name: /burn after reading/i })
    ).toBeInTheDocument();
  });
});
