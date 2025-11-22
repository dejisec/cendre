import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { decryptMessage, importKeyFromBase64Url } from "./lib/crypto";

type ViewState = "idle" | "loading" | "ready" | "missing-key" | "expired" | "error";

interface SecretResponse {
  ciphertext: string;
  iv: string;
}

export function ReadView() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  const [state, setState] = useState<ViewState>("idle");
  const [plaintext, setPlaintext] = useState<string | null>(null);

  useEffect(() => {
    const secretId = id;
    if (!secretId) {
      setState("error");
      return;
    }

    const hash = location.hash?.slice(1) ?? "";
    if (!hash) {
      setState("missing-key");
      return;
    }

    let cancelled = false;

    async function fetchAndDecrypt() {
      try {
        setState("loading");
        const response = await fetch(`/api/secret/${secretId}`);

        if (response.status === 404) {
          if (!cancelled) setState("expired");
          return;
        }

        if (!response.ok) {
          if (!cancelled) setState("error");
          return;
        }

        const json = (await response.json()) as SecretResponse;

        const key = await importKeyFromBase64Url(hash);
        const message = await decryptMessage(
          json.ciphertext,
          json.iv,
          key
        );

        if (!cancelled) {
          setPlaintext(message);
          setState("ready");
        }
      } catch {
        if (!cancelled) {
          setState("error");
        }
      }
    }

    fetchAndDecrypt();

    return () => {
      cancelled = true;
    };
  }, [id, location.hash]);

  if (state === "missing-key") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-200">
          This link is missing the decryption key fragment.
        </p>
        <p className="text-xs text-slate-300">
          Ask the sender to share the full URL including everything after the{" "}
          <code className="font-mono text-slate-100">#</code> symbol.
        </p>
      </div>
    );
  }

  if (state === "expired") {
    return (
      <p className="text-sm text-amber-200">
        This secret has already been read or has expired. It is no longer
        available.
      </p>
    );
  }

  if (state === "error") {
    return (
      <p className="text-sm text-red-200">
        Something went wrong while trying to read this secret.
      </p>
    );
  }

  if (state === "loading" || state === "idle") {
    return (
      <p className="text-sm text-slate-200">
        Decrypting your secret…
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-emerald-100">
        This secret has been decrypted. It will not be available again.
      </p>
      <div className="rounded-md bg-slate-900 border border-emerald-500/60 px-3 py-2">
        <pre className="whitespace-pre-wrap break-words text-sm text-emerald-50 font-mono">
          {plaintext}
        </pre>
      </div>
    </div>
  );
}


