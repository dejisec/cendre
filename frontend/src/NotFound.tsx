import { Link } from "react-router-dom";
import { Callout } from "./ui/Callout";
import { useDocumentTitle } from "./lib/useDocumentTitle";

export function NotFound() {
  useDocumentTitle("Cendre · page not found");
  return (
    <div className="stack">
      <Callout tone="warn" title="Page not found">
        There's nothing at this address. The link may be mistyped or missing
        part of its path. One-time links look like{" "}
        <code>/s/&lt;id&gt;#&lt;key&gt;</code>.
      </Callout>
      <Link className="btn btn-ghost btn-block" to="/">
        ← create a one-time secret
      </Link>
    </div>
  );
}
