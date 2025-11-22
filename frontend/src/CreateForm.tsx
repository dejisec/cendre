import { FormEvent, useState } from "react";
import {
  encryptMessage,
  exportKeyToBase64Url,
  generateKey
} from "./lib/crypto";

interface ApiResponse {
  id: string;
  expires_at: string;
}

const DEFAULT_TTL_SECS =
  Number(import.meta.env.VITE_DEFAULT_TTL_SECS) || 3600;

export function CreateForm() {
  const [secret, setSecret] = useState("");
  const [ttlSecs, setTtlSecs] = useState<number>(DEFAULT_TTL_SECS);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setApiError(null);
    setResultUrl(null);

    if (!secret.trim()) {
      setError("Please enter a secret message to encrypt.");
      return;
    }

    if (!ttlSecs || ttlSecs <= 0) {
      setError("Please choose a valid time-to-live (TTL).");
      return;
    }

    setSubmitting(true);
    try {
      const key = await generateKey();
      const { ciphertextB64Url, ivB64Url } = await encryptMessage(secret, key);
      const encodedKey = await exportKeyToBase64Url(key);

      const response = await fetch("/api/secrets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ciphertext: ciphertextB64Url,
          iv: ivB64Url,
          ttl_secs: ttlSecs
        })
      });

      if (!response.ok) {
        setApiError("Failed to store secret. Please try again.");
        return;
      }

      const json = (await response.json()) as ApiResponse;
      const configuredBaseUrl =
        (import.meta.env.VITE_CENDRE_BASE_URL as string | undefined) || "";
      const baseUrl = configuredBaseUrl || window.location.origin || "";
      const url = `${baseUrl}/s/${json.id}#${encodedKey}`;
      setResultUrl(url);
    } catch (e) {
      setApiError("Unexpected error while encrypting or sending secret.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {apiError ? (
        <div className="rounded-md bg-red-900/40 border border-red-500/60 px-3 py-2 text-sm text-red-100">
          {apiError}
        </div>
      ) : null}

      <div className="space-y-2">
        <label
          htmlFor="secret"
          className="block text-sm font-medium text-slate-100"
        >
          Secret message
        </label>
        <textarea
          id="secret"
          name="secret"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          rows={5}
          placeholder="Paste or type the sensitive text you want to share once…"
        />
        {error ? (
          <p className="text-xs text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <label
            htmlFor="ttl"
            className="block text-sm font-medium text-slate-100"
          >
            Time to live (TTL)
          </label>
          <select
            id="ttl"
            name="ttl"
            value={ttlSecs}
            onChange={(e) => setTtlSecs(Number(e.target.value))}
            className="rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          >
            <option value={300}>5 minutes</option>
            <option value={3600}>1 hour</option>
            <option value={86400}>24 hours</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 inline-flex items-center justify-center rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-60 disabled:cursor-not-allowed sm:mt-6"
        >
          {submitting ? "Encrypting…" : "Create one-time link"}
        </button>
      </div>

      {resultUrl ? (
        <div className="mt-4 space-y-2 rounded-md border border-emerald-500/60 bg-emerald-900/30 px-3 py-2">
          <p className="text-sm text-emerald-100">
            Share this link once. Anyone with the link can read the secret a
            single time:
          </p>
          <input
            aria-label="One-time secret URL"
            className="w-full rounded-md bg-slate-950 border border-emerald-600 px-2 py-1 text-xs font-mono text-emerald-50"
            value={resultUrl}
            readOnly
          />
        </div>
      ) : null}
    </form>
  );
}


