import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the shell chrome and the create form on the index route", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText(/cendre@secure/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/secret message/i)).toBeInTheDocument();
  });

  it("renders a not-found view with a link home for unknown routes", () => {
    render(
      <MemoryRouter initialEntries={["/totally-unknown-path"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /create a one-time secret/i })
    ).toHaveAttribute("href", "/");
  });
});
