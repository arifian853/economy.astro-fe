import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const root = new URL("..", import.meta.url);
const page = readFileSync(new URL("pages/share.astro", root), "utf8");
const styles = readFileSync(new URL("styles/global.css", root), "utf8");

describe("public share page", () => {
  test("shows the event's budget, spending, remaining funds and channels without read-only boilerplate", () => {
    expect(page).toContain("public-total-budget");
    expect(page).toContain("public-total-expenses");
    expect(page).toContain("public-total-remaining");
    expect(page).toContain("public-cash-budget");
    expect(page).toContain("public-digital-budget");
    expect(page).not.toMatch(/hanya baca|hanya lihat|tetap privat|oversharing/i);
  });

  test("gives the ledger heading breathing room above its divider", () => {
    expect(page).toMatch(/\.public-ledger-section-head\s*\{[^}]*padding:\s*22px\s+22px\s+14px/i);
  });

  test("uses full borders or none, never a left-only border", () => {
    expect(styles).not.toMatch(/border-left\s*:/i);
  });
});
