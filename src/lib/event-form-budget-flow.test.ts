import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const form = readFileSync(new URL("../components/EventForm.astro", import.meta.url), "utf8");

describe("audited budget adjustment UX", () => {
  test("editing an event routes budget changes through the dedicated adjustment ledger", () => {
    expect(form).toContain("budgetInput.disabled = true");
    expect(form).toContain("budget: isEdit ? undefined : budget");
  });
});
