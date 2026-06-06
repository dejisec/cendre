import { ReactNode } from "react";

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, children }: FieldProps) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={htmlFor}>
        <span>
          <span className="marker">▸</span> {label}
        </span>
        {hint != null && <span>{hint}</span>}
      </label>
      {children}
    </div>
  );
}
