import { useEffect, useRef, useState } from "react";

interface CopyFieldProps {
  label: string;
  value: string;
}

type Status = "idle" | "copied" | "failed";

export function CopyField({ label, value }: CopyFieldProps) {
  const [status, setStatus] = useState<Status>("idle");
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      fieldRef.current?.select();
      setStatus("failed");
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStatus("idle"), 3000);
  }

  const buttonLabel =
    status === "copied" ? "copied" : status === "failed" ? "select & copy manually" : "copy";

  return (
    <div className="copyfield">
      <div className="field-label">
        <span>
          <span className="marker">▸</span> {label}
        </span>
      </div>
      <div className="copyfield-row">
        <textarea
          ref={fieldRef}
          className="copyfield-value"
          aria-label={label}
          value={value}
          readOnly
          rows={2}
          spellCheck={false}
          onClick={(e) => e.currentTarget.select()}
        />
        <button type="button" className="btn btn-ghost" onClick={copy}>
          {buttonLabel}
        </button>
      </div>
      {status === "failed" && (
        <p className="warn-text" role="status">
          Couldn't reach the clipboard — the link is selected, press ⌘/Ctrl-C to copy.
        </p>
      )}
    </div>
  );
}
