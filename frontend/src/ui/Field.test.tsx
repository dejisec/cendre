import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Field } from "./Field";

describe("Field", () => {
  it("associates the label with the control via htmlFor/id", () => {
    render(
      <Field label="Secret message" htmlFor="secret">
        <textarea id="secret" />
      </Field>
    );
    expect(screen.getByLabelText(/secret message/i)).toBeInTheDocument();
  });

  it("renders an optional hint", () => {
    render(
      <Field label="Secret message" htmlFor="secret" hint="3 chars">
        <textarea id="secret" />
      </Field>
    );
    expect(screen.getByText("3 chars")).toBeInTheDocument();
  });
});
