import { describe, expect, test } from "bun:test";
import { getBudgetOutcome, getEventLifecycleView } from "./event-lifecycle";

describe("event lifecycle presentation", () => {
  test("active events can still be completed and managed", () => {
    expect(getEventLifecycleView("active")).toEqual({
      isArchived: false,
      canComplete: true,
      canEditEvent: true,
      canEditLedger: true,
      canDeleteEvent: true,
      canManagePublicLink: true,
    });
  });

  test("completed events are immutable archives that can still be deleted", () => {
    expect(getEventLifecycleView("completed")).toEqual({
      isArchived: true,
      canComplete: false,
      canEditEvent: false,
      canEditLedger: false,
      canDeleteEvent: true,
      canManagePublicLink: true,
    });
  });

  test("final balances distinguish surplus, even spend, and deficit", () => {
    expect(getBudgetOutcome(1_000_000, 850_000)).toEqual({ kind: "surplus", amount: 150_000 });
    expect(getBudgetOutcome(1_000_000, 1_000_000)).toEqual({ kind: "balanced", amount: 0 });
    expect(getBudgetOutcome(1_000_000, 1_075_000)).toEqual({ kind: "deficit", amount: 75_000 });
  });
});
