import { ReactNode } from "react";

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  return (
    <div className="shell">
      <header className="shell-header">
        <h1 className="shell-prompt">
          <span className="dim">cendre@secure</span> ~ burn after reading
        </h1>
        <span>no-log · zero-knowledge</span>
      </header>
      <main className="shell-main">{children}</main>
      <footer className="shell-footer shell-footer--single">
        <span>the key never leaves your browser — encrypted client-side with AES-256-GCM</span>
      </footer>
    </div>
  );
}
