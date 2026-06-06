import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StepLog } from "./StepLog";

describe("StepLog", () => {
  it("renders nothing when there are no lines", () => {
    const { container } = render(<StepLog lines={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders each line", () => {
    render(<StepLog lines={["encrypting", "uploading"]} />);
    expect(screen.getByText("encrypting")).toBeInTheDocument();
    expect(screen.getByText("uploading")).toBeInTheDocument();
  });
});
