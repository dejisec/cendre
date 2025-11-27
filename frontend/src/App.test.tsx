import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

describe("App", () => {
  it("renders Cendre heading", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    // The boot screen shows the main product identity as ASCII art text.
    expect(
      screen.getByText(/SECURE ENCRYPTED MESSAGE TRANSMISSION/i)
    ).toBeInTheDocument();
  });
});


