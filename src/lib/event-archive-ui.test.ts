import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const eventPage = readFileSync(new URL("../pages/event/[id].astro", import.meta.url), "utf8");
const homePage = readFileSync(new URL("../pages/index.astro", import.meta.url), "utf8");
const settlement = readFileSync(new URL("../components/SettlementSummary.astro", import.meta.url), "utf8");
const eventForm = readFileSync(new URL("../components/EventForm.astro", import.meta.url), "utf8");

describe("event archive UI integration", () => {
  test("offers a deliberate completion confirmation and explains the permanent lock", () => {
    expect(eventPage).toContain('id="btn-complete-event"');
    expect(eventPage).toContain('id="complete-event-dialog"');
    expect(eventPage).toContain("/complete");
    expect(eventPage).toContain("arsip permanen");
  });

  test("completed details retain data while hiding ledger mutation controls", () => {
    expect(eventPage).toContain("getEventLifecycleView(event.status)");
    expect(eventPage).toContain("canEditLedger");
    expect(eventPage).toContain("btn-add-transaction");
    expect(eventPage).toContain("tdActions.hidden = !lifecycle.canEditLedger");
  });

  test("the completed event has a final budget and spending report", () => {
    expect(settlement).toContain("Laporan akhir event");
    expect(settlement).toContain('id="report-budget"');
    expect(settlement).toContain('id="report-expenses"');
    expect(settlement).toContain('id="report-outcome"');
  });

  test("home cards keep completed events visible, immutable, and deletable", () => {
    expect(homePage).toContain("events.forEach((ev)");
    expect(homePage).toContain("getEventLifecycleView(ev.status)");
    expect(homePage).toContain("editBtn.hidden");
    expect(homePage).toContain("deleteBtn.hidden");
    expect(homePage).toContain("if (lifecycle.canDeleteEvent)");
    expect(homePage).toContain("confirmDialog({");
    expect(homePage).toContain("semua data di dalamnya akan dihapus permanen");
  });

  test("event creation and editing cannot bypass the explicit completion flow", () => {
    expect(eventForm).not.toContain('<option value="completed">');
    expect(eventForm).toContain('"upcoming" | "active"');
  });
});
