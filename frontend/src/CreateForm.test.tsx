import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateForm } from "./CreateForm";
import * as cryptoLib from "./lib/crypto";

describe("CreateForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error - allow assigning fetch mock in tests
    global.fetch = vi.fn();
  });

  it("renders textarea, ttl selector, and submit button", () => {
    render(<CreateForm />);

    expect(
      screen.getByLabelText(/secret message/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/time to live/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create one-time link/i })
    ).toBeInTheDocument();
  });

  it("shows validation error when secret is empty", async () => {
    const user = userEvent.setup();
    render(<CreateForm />);

    await user.click(
      screen.getByRole("button", { name: /create one-time link/i })
    );

    expect(
      screen.getByText(/please enter a secret message/i)
    ).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("encrypts the message, posts to API, and shows a one-time URL", async () => {
    const user = userEvent.setup();

    const mockKey = {} as CryptoKey;
    vi.spyOn(cryptoLib, "generateKey").mockResolvedValue(mockKey);
    vi.spyOn(cryptoLib, "encryptMessage").mockResolvedValue({
      ciphertextB64Url: "ciphertext-b64",
      ivB64Url: "iv-b64"
    });
    vi.spyOn(cryptoLib, "exportKeyToBase64Url").mockResolvedValue(
      "encoded-key"
    );

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        id: "abc123",
        expires_at: "2025-01-01T00:00:00.000Z"
      })
    });
    // @ts-expect-error - assigning fetch mock
    global.fetch = fetchMock;

    render(<CreateForm />);

    await user.type(
      screen.getByLabelText(/secret message/i),
      "hello cendre"
    );
    await user.selectOptions(
      screen.getByLabelText(/time to live/i),
      "3600"
    );

    await user.click(
      screen.getByRole("button", { name: /create one-time link/i })
    );

    const urlInput = await screen.findByDisplayValue(/\/s\/abc123#/i);
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


