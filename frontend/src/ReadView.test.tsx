import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReadView } from "./ReadView";

vi.mock("./lib/crypto", () => ({ decryptWithToken: vi.fn() }));
import { decryptWithToken } from "./lib/crypto";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/s/:id" element={<ReadView />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ReadView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error - allow assigning fetch mock in tests
    global.fetch = vi.fn();
  });

  it("shows an error when the decryption key fragment is missing", () => {
    const fetchMock = vi.fn();
    // @ts-expect-error - assigning fetch mock
    global.fetch = fetchMock;
    renderAt("/s/abc123");
    expect(screen.getByText(/decryption key/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not fetch until the user clicks reveal", () => {
    const fetchMock = vi.fn();
    // @ts-expect-error - assigning fetch mock
    global.fetch = fetchMock;
    renderAt("/s/abc123#encoded-key");
    expect(
      screen.getByRole("button", { name: /reveal & burn/i })
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches and decrypts the secret after clicking reveal", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ciphertext: "ciphertext-b64", iv: "iv-b64" }),
    });
    // @ts-expect-error - assigning fetch mock
    global.fetch = fetchMock;
    vi.mocked(decryptWithToken).mockResolvedValue("hello secret");

    renderAt("/s/abc123#encoded-key");
    await user.click(screen.getByRole("button", { name: /reveal & burn/i }));

    expect(await screen.findByText(/hello secret/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/secret/abc123");
  });

  it("shows the gone state on 404", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    });
    // @ts-expect-error - assigning fetch mock
    global.fetch = fetchMock;

    renderAt("/s/abc123#encoded-key");
    await user.click(screen.getByRole("button", { name: /reveal & burn/i }));

    expect(
      await screen.findByText(/already been read or has expired/i)
    ).toBeInTheDocument();
  });

  it("shows the error state when the server responds with a non-ok, non-404 status", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });
    // @ts-expect-error - assigning fetch mock
    global.fetch = fetchMock;

    renderAt("/s/abc123#encoded-key");
    await user.click(screen.getByRole("button", { name: /reveal & burn/i }));

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
  });

  it("shows a distinct, non-retry message when decryption fails (wrong/tampered key)", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ciphertext: "ciphertext-b64", iv: "iv-b64" }),
    });
    // @ts-expect-error - assigning fetch mock
    global.fetch = fetchMock;
    vi.mocked(decryptWithToken).mockRejectedValue(new Error("decrypt failed"));

    renderAt("/s/abc123#encoded-key");
    await user.click(screen.getByRole("button", { name: /reveal & burn/i }));

    expect(await screen.findByText(/couldn't be decrypted/i)).toBeInTheDocument();
    expect(screen.queryByText(/check your connection/i)).not.toBeInTheDocument();
  });

  it("shows progress and removes the reveal button while revealing, fetching once", async () => {
    const user = userEvent.setup();
    // A fetch that stays pending so we can observe the intermediate state.
    const fetchMock = vi.fn().mockReturnValue(new Promise(() => {}));
    // @ts-expect-error - assigning fetch mock
    global.fetch = fetchMock;

    renderAt("/s/abc123#encoded-key");
    await user.click(screen.getByRole("button", { name: /reveal & burn/i }));

    // Gate button is gone (so it can't be clicked again) and progress shows.
    expect(
      screen.queryByRole("button", { name: /reveal & burn/i })
    ).not.toBeInTheDocument();
    expect(screen.getByText(/fetching ciphertext/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows a manual-copy hint when the clipboard is blocked on the revealed secret", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ciphertext: "ciphertext-b64", iv: "iv-b64" }),
    });
    // @ts-expect-error - assigning fetch mock
    global.fetch = fetchMock;
    vi.mocked(decryptWithToken).mockResolvedValue("top secret value");
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });

    renderAt("/s/abc123#encoded-key");
    await user.click(screen.getByRole("button", { name: /reveal & burn/i }));
    await user.click(await screen.findByRole("button", { name: /^copy$/i }));

    expect(await screen.findByText(/select the text above/i)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("warns on the gate that the secret may already have been read", () => {
    const fetchMock = vi.fn();
    // @ts-expect-error - assigning fetch mock
    global.fetch = fetchMock;
    renderAt("/s/abc123#encoded-key");
    expect(screen.getByText(/if it hasn't already been read/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
