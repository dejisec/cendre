import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { decryptMessage, importKeyFromBase64Url } from "./lib/crypto";

const isTestEnv = import.meta.env.MODE === "test";

function sleep(ms: number) {
  if (isTestEnv) return Promise.resolve();
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
  const [decryptionSteps, setDecryptionSteps] = useState<string[]>([]);
  const [showContent, setShowContent] = useState(false);

  const addDecryptionStep = (step: string) => {
    setDecryptionSteps(prev => [...prev, step]);
  };

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
        setDecryptionSteps([]);
        
        addDecryptionStep("INITIATING: Secure connection...");
        await sleep(400);
        
        addDecryptionStep(`REQUESTING: Secret ID ${secretId?.substring(0, 8) || 'unknown'}...`);
        const response = await fetch(`/api/secret/${secretId}`);

        if (response.status === 404) {
          addDecryptionStep("ERROR: Secret not found or already consumed.");
          if (!cancelled) setState("expired");
          return;
        }

        if (!response.ok) {
          addDecryptionStep("ERROR: Failed to retrieve encrypted data.");
          if (!cancelled) setState("error");
          return;
        }

        addDecryptionStep("RECEIVED: Encrypted payload.");
        await sleep(300);
        
        const json = (await response.json()) as SecretResponse;
        
        addDecryptionStep("IMPORTING: Decryption key from URL fragment...");
        await sleep(300);
        const key = await importKeyFromBase64Url(hash);
        
        addDecryptionStep("DECRYPTING: Message with AES-256-GCM...");
        await sleep(500);
        const message = await decryptMessage(
          json.ciphertext,
          json.iv,
          key
        );

        addDecryptionStep("SUCCESS: Message decrypted successfully.");
        addDecryptionStep("WARNING: This message has been permanently deleted from server.");
        
        if (!cancelled) {
          setPlaintext(message);
          setState("ready");
          setTimeout(() => setShowContent(true), 500);
        }
      } catch (error) {
        addDecryptionStep("CRITICAL ERROR: Decryption failed.");
        addDecryptionStep("POSSIBLE CAUSES: Invalid key or corrupted data.");
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

  // Missing Key Error
  if (state === "missing-key") {
    return (
      <div className="space-y-4">
        <div className="rounded border border-terminal-red bg-terminal-red/10 p-4">
          <div className="text-terminal-red font-mono">
            <div className="text-sm font-bold mb-2">
              <span className="animate-pulse">⚠</span> AUTHENTICATION FAILURE
            </div>
            <div className="text-xs space-y-1 text-terminal-red-dim">
              <div>ERROR CODE: MISSING_DECRYPTION_KEY</div>
              <div>REQUIRED: Full URL including hash fragment (#)</div>
              <div>ACTION: Request complete link from sender</div>
            </div>
          </div>
        </div>
        <div className="text-xs text-terminal-green font-mono">
          <div>━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
          <div className="mt-2">STATUS: BLOCKED | REASON: INSUFFICIENT CREDENTIALS</div>
        </div>
      </div>
    );
  }

  // Expired or Already Read
  if (state === "expired") {
    return (
      <div className="space-y-4">
        <div className="rounded border border-terminal-amber bg-terminal-amber/10 p-4">
          <div className="text-terminal-amber font-mono">
            <div className="text-sm font-bold mb-2">
              <span className="animate-pulse">✗</span> MESSAGE UNAVAILABLE
            </div>
            <div className="text-xs space-y-1 text-terminal-amber-dim">
              <div>STATUS: Message has been consumed or expired</div>
              <div>SECURITY: One-time access protocol enforced</div>
              <div>RECOMMENDATION: Request new secure link from sender</div>
            </div>
          </div>
        </div>
        <div className="text-xs text-terminal-green font-mono">
          <div>━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
          <div className="mt-2">MESSAGE STATUS: DESTROYED | PROTOCOL: ZERO-KNOWLEDGE</div>
        </div>
      </div>
    );
  }

  // General Error
  if (state === "error") {
    return (
      <div className="space-y-4">
        <div className="rounded border border-terminal-red bg-terminal-red/10 p-4">
          <div className="text-terminal-red font-mono">
            <div className="text-sm font-bold mb-2">
              <span className="animate-pulse">✗</span> SYSTEM ERROR
            </div>
            <div className="text-xs space-y-1 text-terminal-red-dim">
              <div>ERROR: Unable to process secure message</div>
              <div>DIAGNOSTICS: Check network connection and URL integrity</div>
              <div>SUPPORT: Contact sender for new link</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading State
  if (state === "loading" || state === "idle") {
    return (
      <div className="space-y-4">
        <div className="text-terminal-green font-mono">
          <div className="text-sm mb-4 flex items-center">
            <span className="animate-pulse mr-2">◉</span>
            DECRYPTION IN PROGRESS...
          </div>
          
          {decryptionSteps.length > 0 && (
            <div className="rounded border border-terminal-green/30 bg-black/60 p-4 text-xs space-y-1">
              {decryptionSteps.map((step, index) => (
                <div key={index} className="text-terminal-green">
                  <span className="text-terminal-cyan">$</span> {step}
                </div>
              ))}
              <div className="animate-pulse cursor"></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Success - Show Decrypted Message
  return (
    <div className="space-y-4">
      {/* Success Header */}
      <div className="text-terminal-green font-mono">
        <div className="text-sm font-bold mb-2 flex items-center">
          <span className="text-terminal-green mr-2">✓</span>
          MESSAGE DECRYPTED SUCCESSFULLY
        </div>
        <div className="text-xs text-terminal-amber animate-pulse">
          <span className="text-terminal-amber">⚠</span> WARNING: This message has been permanently deleted from the server
        </div>
      </div>

      {/* Decrypted Content */}
      <div className={`rounded border border-terminal-green bg-terminal-green/5 p-4 transition-all duration-500 ${
        showContent ? 'opacity-100 transform-none' : 'opacity-0 transform translate-y-2'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-terminal-green font-mono">
            DECRYPTED_CONTENT.TXT
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(plaintext || "")}
            className="text-xs text-terminal-green hover:text-terminal-green font-mono px-2 py-1 border border-terminal-green/50 rounded hover:bg-terminal-green/10 transition-all"
          >
            [COPY]
          </button>
        </div>
        <div className="bg-black/60 rounded p-4 border border-terminal-green/30">
          <pre className="whitespace-pre-wrap break-words text-sm text-terminal-green font-mono leading-relaxed terminal-text">
            {plaintext}
          </pre>
        </div>
      </div>

      {/* Decryption Log */}
      {decryptionSteps.length > 0 && (
        <details className="text-xs text-terminal-green font-mono">
          <summary className="cursor-pointer hover:text-terminal-green transition-colors">
            [VIEW DECRYPTION LOG]
          </summary>
          <div className="mt-2 rounded border border-terminal-green/20 bg-black/40 p-3 space-y-1">
            {decryptionSteps.map((step, index) => (
              <div key={index}>
                <span className="text-terminal-cyan">$</span> {step}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Footer */}
      <div className="text-xs text-terminal-green font-mono text-center">
        <div>━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
        <div className="mt-2">ENCRYPTION: AES-256-GCM | STATUS: VERIFIED</div>
      </div>
    </div>
  );
}