import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../pages/event/[id].astro", import.meta.url), "utf8");
const settlement = readFileSync(new URL("../components/SettlementSummary.astro", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles/global.css", import.meta.url), "utf8");

describe("event dashboard layout", () => {
  test("keeps purchase details before settlement and hides settlement until completion", () => {
    expect(page.indexOf("<!-- Transactions Section -->")).toBeLessThan(page.indexOf("<SettlementSummary />"));
    expect(settlement).toContain('id="settlement-section"');
    expect(settlement).toContain('class="card settlement-card" hidden');
    expect(settlement).toContain('event.status !== "completed"');
  });

  test("places remaining funds first and uses the shared mood container", () => {
    expect(page.indexOf('id="stat-card-remaining"')).toBeLessThan(page.indexOf('id="summary-expenses"'));
    expect(styles).toContain("background: var(--primary-container)");
    expect(styles).not.toMatch(/border-left\s*:/i);
  });
});
