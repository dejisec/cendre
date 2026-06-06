import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useDocumentTitle } from "./useDocumentTitle";

describe("useDocumentTitle", () => {
  it("sets the document title and restores it on unmount", () => {
    const original = document.title;
    const { unmount } = renderHook(() => useDocumentTitle("Cendre · test page"));
    expect(document.title).toBe("Cendre · test page");
    unmount();
    expect(document.title).toBe(original);
  });
});
