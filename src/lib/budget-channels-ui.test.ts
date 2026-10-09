import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const component = readFileSync(new URL("../components/BudgetChannels.astro", import.meta.url), "utf8");

describe("budget channel controls", () => {
  test("lets the owner allocate cash while digital is derived from total", () => {
    expect(component).toContain('id="cash-budget-input"');
    expect(component).toContain('id="digital-budget-preview"');
    expect(component).toContain("Simpan pembagian");
    expect(component).toContain("Digital / QRIS");
    expect(component).toContain("JSON.stringify({ cashBudget })");
  });

  test("keeps archived channel balances visible but disables allocation editing", () => {
    expect(component).toContain('id="budget-channel-form"');
    expect(component).toContain('form.hidden = event.status === "completed"');
    expect(component).toContain("Ringkasan penggunaan dana tunai dan digital.");
  });

  test("presents both channel balances in a responsive bordered layout", () => {
    expect(component).not.toMatch(/id="budget-channel-grid"[^>]*hidden/);
    expect(component).toContain("cash-channel-remaining");
    expect(component).toContain("digital-channel-remaining");
    expect(component).toMatch(/@media\s*\(max-width:/);
    expect(component).not.toMatch(/border-left\s*:/i);
  });
});
