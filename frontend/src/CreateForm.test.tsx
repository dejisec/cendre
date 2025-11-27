import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateForm } from "./CreateForm";
import * as cryptoLib from "./lib/crypto";

describe("CreateForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn();
  });

  it("renders textarea, ttl selector, and submit button", () => {
    render(<CreateForm />);

    expect(
      screen.getByLabelText(/INPUT::SECRET_MESSAGE/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/CONFIG::TIME_TO_LIVE/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /ENCRYPT \+ GENERATE LINK/i })
    ).toBeInTheDocument();
  });

  it("keeps the submit button disabled when secret is empty", async () => {
    const user = userEvent.setup();
    render(<CreateForm />);

    const button = screen.getByRole("button", {
      name: /ENCRYPT \+ GENERATE LINK/i
    });
    await user.click(button);

    // With the new UX the button is simply disabled until there is input.
    expect(button).toBeDisabled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("encrypts the message, posts to API, and shows a one-time URL", async () => {
    const user = userEvent.setup();

    vi.spyOn(cryptoLib, "encryptWithToken").mockResolvedValue({
      ciphertextB64Url: "ciphertext-b64",
      ivB64Url: "iv-b64",
      tokenB64Url: "token-fragment"
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        id: "abc123",
        expires_at: "2025-01-01T00:00:00.000Z"
      })
    });
    globalThis.fetch = fetchMock;

    render(<CreateForm />);

    await user.type(
      screen.getByLabelText(/INPUT::SECRET_MESSAGE/i),
      "hello cendre"
    );
    await user.selectOptions(
      screen.getByLabelText(/CONFIG::TIME_TO_LIVE/i),
      "3600"
    );

    await user.click(
      screen.getByRole("button", { name: /ENCRYPT \+ GENERATE LINK/i })
    );

    const urlInput = await screen.findByLabelText(/Secure URL/i);
    expect(urlInput).toHaveDisplayValue(/\/s\/abc123#token-fragment/i);
    expect(urlInput).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/secrets",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ciphertext: "ciphertext-b64",
          iv: "iv-b64",
          ttl_secs: 3600
        })
      })
    );
  });
});


