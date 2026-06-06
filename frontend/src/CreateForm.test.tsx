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

  it("renders the secret field, expiry selector, and submit button", () => {
    render(<CreateForm />);
    expect(screen.getByLabelText(/secret message/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/expires after/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /encrypt \+ create link/i })
    ).toBeInTheDocument();
  });

  it("keeps the submit button disabled when the secret is empty", async () => {
    const user = userEvent.setup();
    render(<CreateForm />);
    const button = screen.getByRole("button", { name: /encrypt \+ create link/i });
    await user.click(button);
    expect(button).toBeDisabled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("explains why a whitespace-only secret can't be submitted", async () => {
    const user = userEvent.setup();
    render(<CreateForm />);
    await user.type(screen.getByLabelText(/secret message/i), "   ");
    const button = screen.getByRole("button", { name: /encrypt \+ create link/i });
    expect(button).toBeEnabled();
    await user.click(button);
    expect(
      await screen.findByText(/enter a secret before creating a link/i)
    ).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("encrypts the message, posts to the API, and shows a one-time link", async () => {
    const user = userEvent.setup();

    vi.spyOn(cryptoLib, "encryptWithToken").mockResolvedValue({
      ciphertextB64Url: "ciphertext-b64",
      ivB64Url: "iv-b64",
      tokenB64Url: "token-fragment",
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: "abc123" }),
    });
    globalThis.fetch = fetchMock;

    render(<CreateForm />);

    await user.type(screen.getByLabelText(/secret message/i), "hello cendre");
    await user.selectOptions(screen.getByLabelText(/expires after/i), "3600");
    await user.click(
      screen.getByRole("button", { name: /encrypt \+ create link/i })
    );

    const urlInput = await screen.findByLabelText(/one-time link/i);
    expect(urlInput).toHaveDisplayValue(/\/s\/abc123#token-fragment/i);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/secrets",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ciphertext: "ciphertext-b64",
          iv: "iv-b64",
          ttl_secs: 3600,
        }),
      })
    );
  });

  it("sets a descriptive document title", () => {
    render(<CreateForm />);
    expect(document.title).toMatch(/create a one-time secret/i);
  });
});
