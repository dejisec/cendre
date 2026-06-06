import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { decryptWithToken } from "./lib/crypto";
import { useDocumentTitle } from "./lib/useDocumentTitle";
import { Button } from "./ui/Button";
import { StepLog } from "./ui/StepLog";
import { Callout } from "./ui/Callout";

type ViewState =
  | "gate"
  | "missing-key"
  | "revealing"
  | "revealed"
  | "gone"
  | "error"
  | "decrypt-error";

interface SecretResponse {
  ciphertext: string;
  iv: string;
}

export function ReadView() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const fragment = location.hash?.slice(1) ?? "";

  const initial: ViewState = !id ? "error" : !fragment ? "missing-key" : "gate";
  const [state, setState] = useState<ViewState>(initial);
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [steps, setSteps] = useState<string[]>([]);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const secretRef = useRef<HTMLPreElement>(null);
  const startedRef = useRef(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  useDocumentTitle("Cendre · reveal a one-time secret");

  async function reveal() {
    // Guard against re-entry: a one-time secret must be fetched at most once.
    if (!id || !fragment || startedRef.current) return;
    startedRef.current = true;
    setState("revealing");
    const log: string[] = [];
    const push = (line: string) => {
      log.push(line);
      setSteps([...log]);
    };

    let json: SecretResponse;
    try {
      push("› fetching ciphertext…");
      const response = await fetch(`/api/secret/${id}`);

      if (response.status === 404) {
        setState("gone");
        return;
      }
      if (!response.ok) {
        setState("error");
        return;
      }
      json = (await response.json()) as SecretResponse;
    } catch {
      setState("error");
      return;
    }

    try {
      push("› decrypting in your browser…");
      const message = await decryptWithToken(json.ciphertext, json.iv, fragment);
      push("› deleted from the server");
      setPlaintext(message);
      setState("revealed");
    } catch {
      setState("decrypt-error");
    }
  }

  async function copy() {
    if (!plaintext) return;
    try {
      await navigator.clipboard.writeText(plaintext);
      setCopyStatus("copied");
    } catch {
      const el = secretRef.current;
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      setCopyStatus("failed");
    }
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopyStatus("idle"), 3000);
  }

  if (state === "missing-key") {
    return (
      <Callout tone="error" title="Incomplete link">
        This link is missing its decryption key (the part after #). Ask the
        sender for the complete link — that key never reaches our server.
      </Callout>
    );
  }

  if (state === "error") {
    return (
      <Callout tone="error" title="Something went wrong">
        We couldn't read this secret. Check your connection and that the link is
        intact, or ask the sender for a new one.
      </Callout>
    );
  }

  if (state === "decrypt-error") {
    return (
      <Callout tone="error" title="This secret couldn't be decrypted">
        The decryption key in this link is wrong or incomplete. Because opening a
        one-time secret consumes it, this link is now spent — ask the sender for
        a new one.
      </Callout>
    );
  }

  if (state === "gone") {
    return (
      <Callout tone="warn" title="Nothing here">
        This secret has already been read or has expired. One-time means one
        time — ask the sender for a new link.
      </Callout>
    );
  }

  if (state === "revealing") {
    return (
      <div className="stack">
        <StepLog lines={steps} />
      </div>
    );
  }

  if (state === "revealed") {
    return (
      <div className="stack">
        <StepLog lines={steps} />
        <div className="copyfield">
          <div className="field-label">
            <span>
              <span className="marker">▸</span> Decrypted secret
            </span>
            <button type="button" className="btn btn-ghost" onClick={copy}>
              {copyStatus === "copied" ? "copied" : copyStatus === "failed" ? "select & copy" : "copy"}
            </button>
          </div>
          <pre ref={secretRef} className="steplog" style={{ marginTop: "0.4rem" }}>
            {plaintext}
          </pre>
          {copyStatus === "failed" && (
            <p className="warn-text" role="status">
              Couldn't reach the clipboard — select the text above and press ⌘/Ctrl-C.
            </p>
          )}
        </div>
        <p className="warn-text">
          This secret is now gone. Save it elsewhere if you need it.
        </p>
      </div>
    );
  }

  // state === "gate"
  return (
    <div className="stack center">
      <p className="muted">A one-time secret is waiting.</p>
      <p className="hint">
        If it hasn't already been read, revealing decrypts it and permanently
        deletes it from the server. Only continue when you're ready to read it.
      </p>
      <Button block onClick={reveal}>
        reveal &amp; burn →
      </Button>
    </div>
  );
}
