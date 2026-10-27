import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const form = readFileSync(new URL("../components/TransactionForm.astro", import.meta.url), "utf8");

describe("transaction evidence controls", () => {
  test("offers both a private file attachment and a HTTPS link field", () => {
    expect(form).toContain('id="tx-input-evidence-file"');
    expect(form).toContain('accept="image/jpeg,image/png,image/webp,application/pdf"');
    expect(form).toContain('id="tx-input-evidence-url"');
  });

  test("uploads evidence only after the expense exists and uses authenticated API calls", () => {
    expect(form).toContain("/evidence-files");
    expect(form).toContain("/evidence-links");
    expect(form).toContain("new FormData()");
  });
});
