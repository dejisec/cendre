import { FormEvent, useState, useEffect } from "react";
import {
  encryptMessage,
  exportKeyToBase64Url,
  generateKey
} from "./lib/crypto";

const isTestEnv = import.meta.env.MODE === "test";

function sleep(ms: number) {
  if (isTestEnv) return Promise.resolve();
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
  const [charCount, setCharCount] = useState(0);
  const [showCopied, setShowCopied] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);

  useEffect(() => {
    setCharCount(secret.length);
  }, [secret]);

  const addTerminalLine = (line: string) => {
    setTerminalLines(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${line}`]);
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setApiError(null);
    setResultUrl(null);
    setTerminalLines([]);

    if (!secret.trim()) {
      setError("ERROR: No message detected. Input required.");
      return;
    }

    if (!ttlSecs || ttlSecs <= 0) {
      setError("ERROR: Invalid TTL parameter. Check configuration.");
      return;
    }

    setSubmitting(true);
    addTerminalLine("INITIATING: Secure encryption protocol...");
    
    try {
      await sleep(500);
      addTerminalLine("GENERATING: 256-bit encryption key...");
      const key = await generateKey();
      
      await sleep(300);
      addTerminalLine("ENCRYPTING: Message with AES-256-GCM...");
      const { ciphertextB64Url, ivB64Url } = await encryptMessage(secret, key);
      const encodedKey = await exportKeyToBase64Url(key);

      await sleep(400);
      addTerminalLine("TRANSMITTING: Encrypted payload to secure server...");
      
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
        addTerminalLine("ERROR: Transmission failed. Retrying...");
        setApiError("SYSTEM ERROR: Failed to store encrypted message. Retry operation.");
        return;
      }

      const json = (await response.json()) as ApiResponse;
      const configuredBaseUrl =
        (import.meta.env.VITE_CENDRE_BASE_URL as string | undefined) || "";
      const baseUrl = configuredBaseUrl || window.location.origin || "";
      const url = `${baseUrl}/s/${json.id}#${encodedKey}`;
      
      addTerminalLine("SUCCESS: Secure link generated.");
      addTerminalLine(`HASH: ${json.id.substring(0, 8)}...`);
      addTerminalLine(`TTL: ${ttlSecs} seconds`);
      addTerminalLine("STATUS: Ready for transmission.");
      
      setResultUrl(url);
      setSecret(""); // Clear the secret after successful encryption
    } catch (e) {
      addTerminalLine("CRITICAL ERROR: Encryption protocol failed.");
      setApiError("SYSTEM FAULT: Unexpected error in encryption subsystem.");
    } finally {
      setSubmitting(false);
    }
  }

  const copyToClipboard = async () => {
    if (resultUrl) {
      await navigator.clipboard.writeText(resultUrl);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Terminal Input Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="secret"
                className="text-sm text-terminal-green terminal-text"
              >
                <span className="text-terminal-cyan">▸</span> INPUT::SECRET_MESSAGE
              </label>
              <span className="text-xs text-terminal-green">
                {submitting ? "PROCESSING..." : "READY"}
              </span>
            </div>
            <span className="text-xs text-terminal-green">
              CHARS: [{charCount}/∞]
            </span>
          </div>

          <div className="relative">
            <textarea
              id="secret"
              name="secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="w-full rounded bg-black/80 border border-terminal-green/50 px-3 py-3 text-sm text-terminal-green placeholder:text-terminal-green/50 focus:outline-none focus:border-terminal-green focus:shadow-terminal-glow-sm font-mono resize-none terminal-input"
              style={{ fontSize: "1rem", lineHeight: "1rem" }}
              rows={6}
              placeholder="> Enter classified information here..."
              spellCheck={false}
              disabled={submitting}
            />
          </div>
          
          {error && (
            <div className="text-xs terminal-error font-mono animate-pulse">
              <span className="text-terminal-red">⚠</span> {error}
            </div>
          )}
        </div>

        {/* Configuration Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label
              htmlFor="ttl"
              className="text-sm text-terminal-green terminal-text"
            >
              <span className="text-terminal-cyan">▸</span> CONFIG::TIME_TO_LIVE
            </label>
            <select
              id="ttl"
              name="ttl"
              value={ttlSecs}
              onChange={(e) => setTtlSecs(Number(e.target.value))}
              className="w-full rounded bg-black/80 border border-terminal-green/50 px-3 py-2 text-sm text-terminal-green focus:outline-none focus:border-terminal-green focus:shadow-terminal-glow-sm font-mono appearance-none cursor-pointer terminal-input"
              disabled={submitting}
            >
              <option value={300}>5 minutes</option>
              <option value={3600}>1 hour</option>
              <option value={86400}>24 hours</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting || !secret.trim()}
              className={`w-full px-4 py-2 rounded font-mono text-sm transition-all terminal-button
                ${submitting || !secret.trim() 
                  ? 'bg-terminal-green-dim/10 text-terminal-green/50 border border-terminal-green-dim/30 cursor-not-allowed' 
                  : 'bg-terminal-green/10 text-terminal-green border border-terminal-green hover:bg-terminal-green/20 hover:shadow-terminal-glow active:scale-95'
                }`}
            >
              {submitting ? (
                <span className="inline-flex items-center">
                  <span className="animate-pulse">◉</span>
                  <span className="ml-2">ENCRYPTING...</span>
                </span>
              ) : (
                <span>⟨ ENCRYPT + GENERATE LINK ⟩</span>
              )}
            </button>
          </div>
        </div>

        {/* API Error Display */}
        {apiError && (
          <div className="rounded border border-terminal-red/50 bg-terminal-red/10 px-4 py-3 text-sm font-mono">
            <div className="text-terminal-red terminal-error">
              <span className="font-bold">✗ SYSTEM ERROR</span>
              <div className="mt-1 text-xs">{apiError}</div>
            </div>
          </div>
        )}
      </form>

      {/* Terminal Output */}
      {terminalLines.length > 0 && (
        <div className="rounded border border-terminal-green/30 bg-black/60 p-4 font-mono text-xs">
          <div className="text-terminal-green mb-2">
            ═══ ENCRYPTION TERMINAL OUTPUT ═══
          </div>
          {terminalLines.map((line, index) => (
            <div key={index} className="text-terminal-green">
              <span className="text-terminal-cyan">$</span> {line}
            </div>
          ))}
        </div>
      )}

      {/* Success Result */}
      {resultUrl && (
        <div className="rounded border border-terminal-green bg-terminal-green/10 p-4 space-y-3 animate-pulse-glow">
          <div className="text-sm text-terminal-green font-mono">
            <span className="text-terminal-green font-bold">✓ SUCCESS</span>
            <div className="mt-2 text-xs text-terminal-green">
              ONE-TIME SECURE LINK GENERATED
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              className="px-3 py-2 bg-terminal-green/20 border border-terminal-green/50 rounded text-xs text-terminal-green hover:bg-terminal-green/30 hover:shadow-terminal-glow-sm transition-all font-mono whitespace-nowrap"
            >
              {showCopied ? "COPIED!" : "COPY"}
            </button>
            <input
              aria-label="Secure URL"
              className="flex-1 rounded bg-black/80 border border-terminal-green px-3 py-2 text-xs font-mono text-terminal-green"
              value={resultUrl}
              readOnly
              onClick={(e) => e.currentTarget.select()}
            />
          </div>
          
          <div className="text-xs text-terminal-amber font-mono animate-pulse">
            <span className="text-terminal-amber">⚠</span> WARNING: This link will self-destruct after one access
          </div>
        </div>
      )}

      {/* Terminal Footer */}
      <div className="text-xs text-terminal-green font-mono text-center">
        <div>━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
        <div className="mt-2">ENCRYPTION: AES-256-GCM | KEY: 256-BIT</div>
      </div>
    </div>
  );
}