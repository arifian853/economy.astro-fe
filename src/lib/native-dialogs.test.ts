import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const sources = [
  "../pages/index.astro",
  "../pages/event/[id].astro",
  "../components/PublicSharePanel.astro",
].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

describe("application dialogs", () => {
  test("all destructive confirmations use the styled dialog flow, not browser confirm", () => {
    for (const source of sources) {
      expect(source).not.toMatch(/(?:window\s*\.\s*)?confirm\s*\(/);
    }
  });

  test("user-facing errors use the styled dialog flow, not browser alert", () => {
    for (const source of sources) {
      expect(source).not.toMatch(/(?:window\s*\.\s*)?alert\s*\(/);
    }
  });
});
