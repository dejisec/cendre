import { ReactNode } from "react";

type Tone = "info" | "warn" | "error";

interface CalloutProps {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
}

export function Callout({ tone = "info", title, children }: CalloutProps) {
  return (
    <div className={`callout callout-${tone}`} role={tone === "error" ? "alert" : "status"}>
      {title && <h2 className="callout-title">{title}</h2>}
      {children && <div className="callout-body">{children}</div>}
    </div>
  );
}
