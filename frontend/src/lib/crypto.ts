const AES_ALGO = "AES-GCM";
const AES_KEY_LENGTH = 256;
const IV_LENGTH_BYTES = 12; // recommended for GCM
const TOKEN_LENGTH_BYTES = 16; // 128-bit token keeps URLs short
const HKDF_HASH = "SHA-256";
const textEncoder = new TextEncoder();
const HKDF_SALT = textEncoder.encode("cendre-hkdf-salt");
const HKDF_INFO = textEncoder.encode("cendre:aes-key");

function ensureWebCrypto(): Crypto {
  const crypto = globalThis.crypto as Crypto | undefined;
  if (!crypto || !crypto.subtle) {
    throw new Error(
      "WebCrypto is not available. These helpers require window.crypto.subtle."
    );
  }
  return crypto;
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  if (bytes.byteLength === 0) return "";
  const binary = String.fromCharCode(...bytes);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlToBytes(b64url: string): Uint8Array {
  if (!b64url) return new Uint8Array();
  let base64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4;
  if (padding === 2) base64 += "==";
  else if (padding === 3) base64 += "=";
  else if (padding !== 0) {
    throw new Error("Invalid base64url string");
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface EncryptedPayload {
  ciphertextB64Url: string;
  ivB64Url: string;
}

async function encryptMessage(
  plaintext: string,
  key: CryptoKey
): Promise<EncryptedPayload> {
  const crypto = ensureWebCrypto();
  const iv = new Uint8Array(IV_LENGTH_BYTES);
  crypto.getRandomValues(iv);

  const encoded = textEncoder.encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: AES_ALGO,
      iv: iv as BufferSource
    },
    key,
    encoded as BufferSource
  );

  const cipherBytes = new Uint8Array(ciphertext);
  return {
    ciphertextB64Url: bytesToBase64Url(cipherBytes),
    ivB64Url: bytesToBase64Url(iv)
  };
}

async function decryptMessage(
  ciphertextB64Url: string,
  ivB64Url: string,
  key: CryptoKey
): Promise<string> {
  const crypto = ensureWebCrypto();
  const cipherBytes = base64UrlToBytes(ciphertextB64Url);
  const iv = base64UrlToBytes(ivB64Url);

  const plaintextBuffer = await crypto.subtle.decrypt(
    {
      name: AES_ALGO,
      iv: iv as BufferSource
    },
    key,
    cipherBytes as BufferSource
  );

  const decoder = new TextDecoder();
  return decoder.decode(plaintextBuffer);
}

export interface TokenizedEncryptedPayload extends EncryptedPayload {
  tokenB64Url: string;
}

export async function deriveAesKeyFromToken(
  tokenBytes: Uint8Array
): Promise<CryptoKey> {
  if (!tokenBytes.byteLength) {
    throw new Error("Token must be non-empty");
  }
  const crypto = ensureWebCrypto();
  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    tokenBytes as BufferSource,
    "HKDF",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: HKDF_HASH,
      salt: HKDF_SALT as BufferSource,
      info: HKDF_INFO as BufferSource
    },
    hkdfKey,
    {
      name: AES_ALGO,
      length: AES_KEY_LENGTH
    },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptWithToken(
  plaintext: string
): Promise<TokenizedEncryptedPayload> {
  const crypto = ensureWebCrypto();
  const tokenBytes = new Uint8Array(TOKEN_LENGTH_BYTES);
  crypto.getRandomValues(tokenBytes);
  const key = await deriveAesKeyFromToken(tokenBytes);
  const encrypted = await encryptMessage(plaintext, key);
  return {
    ...encrypted,
    tokenB64Url: bytesToBase64Url(tokenBytes)
  };
}

export async function decryptWithToken(
  ciphertextB64Url: string,
  ivB64Url: string,
  tokenB64Url: string
): Promise<string> {
  const tokenBytes = base64UrlToBytes(tokenB64Url);
  if (!tokenBytes.byteLength) {
    throw new Error("Missing or invalid token in URL fragment");
  }
  const key = await deriveAesKeyFromToken(tokenBytes);
  return decryptMessage(ciphertextB64Url, ivB64Url, key);
}


