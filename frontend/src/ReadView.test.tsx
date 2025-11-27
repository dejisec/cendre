import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReadView } from "./ReadView";

vi.mock("./lib/crypto", () => ({
  decryptWithToken: vi.fn()
}));

import { decryptWithToken } from "./lib/crypto";

describe("ReadView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error - allow assigning fetch mock in tests
    global.fetch = vi.fn();
  });

  it("shows an error when decryption key fragment is missing", () => {
    const fetchMock = vi.fn();
    // @ts-expect-error - assigning fetch mock
    global.fetch = fetchMock;

    render(
      <MemoryRouter initialEntries={["/s/abc123"]}>
        <Routes>
          <Route path="/s/:id" element={<ReadView />} />
        </Routes>
      </MemoryRouter>
    );

    expect(
      screen.getByText(/MISSING_DECRYPTION_KEY/i)
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches and decrypts the secret when id and key are present", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ciphertext: "ciphertext-b64",
        iv: "iv-b64"
      })
    });
    // @ts-expect-error - assigning fetch mock
    global.fetch = fetchMock;

    (decryptWithToken as unknown as vi.Mock).mockResolvedValue("hello secret");

    render(
      <MemoryRouter initialEntries={["/s/abc123#encoded-key"]}>
        <Routes>
          <Route path="/s/:id" element={<ReadView />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/hello secret/i)).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith("/api/secret/abc123");
  });

  it("shows destroyed/expired message on 404", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({})
    });
    // @ts-expect-error - assigning fetch mock
    global.fetch = fetchMock;

    render(
      <MemoryRouter initialEntries={["/s/abc123#encoded-key"]}>
        <Routes>
          <Route path="/s/:id" element={<ReadView />} />
        </Routes>
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/Message has been consumed or expired/i)
    ).toBeInTheDocument();
  });
});


