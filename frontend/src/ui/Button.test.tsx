import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders children and defaults to the primary variant", () => {
    render(<Button>encrypt</Button>);
    const btn = screen.getByRole("button", { name: /encrypt/i });
    expect(btn).toHaveClass("btn-primary");
  });

  it("is disabled and aria-busy while loading", () => {
    render(<Button loading>encrypt</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
  });

  it("applies the ghost variant class", () => {
    render(<Button variant="ghost">x</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-ghost");
  });
});
