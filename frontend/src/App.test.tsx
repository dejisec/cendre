import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders Cendre heading", () => {
    render(<App />);
    expect(screen.getByText("Cendre")).toBeInTheDocument();
  });
});


