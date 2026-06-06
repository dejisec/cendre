import { FormEvent, useState } from "react";
import { encryptWithToken } from "./lib/crypto";
import { useDocumentTitle } from "./lib/useDocumentTitle";
import { Field } from "./ui/Field";
import { Button } from "./ui/Button";
import { StepLog } from "./ui/StepLog";
import { CopyField } from "./ui/CopyField";
import { Callout } from "./ui/Callout";

interface ApiResponse {
  id: string;
}

const DEFAULT_TTL_SECS = Number(import.meta.env.VITE_DEFAULT_TTL_SECS) || 3600;

export function CreateForm() {
  useDocumentTitle("Cendre · create a one-time secret");
  const [secret, setSecret] = useState("");
  const [ttlSecs, setTtlSecs] = useState<number>(DEFAULT_TTL_SECS);
  const [steps, setSteps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setResultUrl(null);
    setSteps([]);

    if (!secret.trim()) {
      setError("Enter a secret before creating a link.");
      return;
    }
    if (!ttlSecs || ttlSecs <= 0) {
      setError("Choose a valid expiry.");
      return;
    }

    setSubmitting(true);
    const log: string[] = [];
    const push = (line: string) => {
      log.push(line);
      setSteps([...log]);
    };

    try {
      push("› encrypting in your browser…");
      const { ciphertextB64Url, ivB64Url, tokenB64Url } = await encryptWithToken(secret);

      push("› uploading ciphertext…");
      const response = await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ciphertext: ciphertextB64Url,
          iv: ivB64Url,
          ttl_secs: ttlSecs,
        }),
      });

      if (!response.ok) {
        setError("Couldn't store the secret. Please try again.");
        setSteps([]);
        return;
      }

      const json = (await response.json()) as ApiResponse;
      const configuredBaseUrl =
        (import.meta.env.VITE_CENDRE_BASE_URL as string | undefined) || "";
      const baseUrl = configuredBaseUrl || window.location.origin || "";
      const url = `${baseUrl}/s/${json.id}#${tokenB64Url}`;

      push("› link ready — opens once, then it's gone");
      setResultUrl(url);
      setSecret("");
    } catch {
      setError("Something went wrong while encrypting. Please try again.");
      setSteps([]);
    } finally {
      setSubmitting(false);
    }
  }

  if (resultUrl) {
    return (
      <div className="stack">
        <StepLog lines={steps} />
        <CopyField label="One-time link" value={resultUrl} />
        <p className="warn-text">
          This link opens once, then the secret is gone. Share it, don't store it.
        </p>
        <Button
          variant="ghost"
          block
          onClick={() => {
            setResultUrl(null);
            setSteps([]);
          }}
        >
          + create another
        </Button>
      </div>
    );
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <Field label="Secret message" htmlFor="secret" hint={`${secret.length} chars`}>
        <textarea
          id="secret"
          className="textarea"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="paste the secret you want to share once…"
          spellCheck={false}
          disabled={submitting}
        />
      </Field>

      <Field label="Expires after" htmlFor="ttl">
        <select
          id="ttl"
          className="select"
          value={ttlSecs}
          onChange={(e) => setTtlSecs(Number(e.target.value))}
          disabled={submitting}
        >
          <option value={300}>5 minutes</option>
          <option value={3600}>1 hour</option>
          <option value={86400}>24 hours</option>
        </select>
      </Field>

      <Button type="submit" block loading={submitting} disabled={secret.length === 0}>
        {submitting ? "encrypting…" : "encrypt + create link →"}
      </Button>

      {error && (
        <Callout tone="error" title="Error">
          {error}
        </Callout>
      )}

      {submitting && <StepLog lines={steps} />}

      <p className="hint">
        Encrypted in your browser · AES-256-GCM · the key never leaves this device.
      </p>
    </form>
  );
}
