import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  bytesToBase64Url,
  base64UrlToBytes,
  encryptWithToken,
  decryptWithToken
} from "./crypto";

describe("base64url helpers", () => {
  it("round-trips bytes through base64url", () => {
    const bytes = new Uint8Array([1, 2, 3, 250, 251, 252, 253, 254, 255]);
    const encoded = bytesToBase64Url(bytes);
    const decoded = base64UrlToBytes(encoded);
    expect(Array.from(decoded)).toEqual(Array.from(bytes));
  });
});

describe("token-based crypto helpers (using WebCrypto)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("encrypts and decrypts a message via the fragment token", async () => {
    const plaintext = "hello cendre";
    const { ciphertextB64Url, ivB64Url, tokenB64Url } =
      await encryptWithToken(plaintext);

    expect(tokenB64Url.length).toBeLessThan(32);

    const decrypted = await decryptWithToken(
      ciphertextB64Url,
      ivB64Url,
      tokenB64Url
    );
    expect(decrypted).toBe(plaintext);
  });

  it("fails to decrypt when the token does not match", async () => {
    const payload = await encryptWithToken("super secret");
    const wrongToken = bytesToBase64Url(new Uint8Array(16)); // different token

    await expect(
      decryptWithToken(payload.ciphertextB64Url, payload.ivB64Url, wrongToken)
    ).rejects.toThrow();
  });

  it("throws a clear error when WebCrypto is unavailable", async () => {
    const getterSpy = vi
      .spyOn(globalThis, "crypto", "get")
      // @ts-expect-error - simulate missing crypto
      .mockReturnValue(undefined);

    await expect(encryptWithToken("failure case")).rejects.toThrow(/WebCrypto/);

    getterSpy.mockRestore();
  });
});


