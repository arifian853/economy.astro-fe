import { describe, expect, test } from "bun:test";
import { normalizePublicEvent } from "./public-view";

const publicPayload = {
  event: { name: "Bukber", eventDate: "2026-11-01", notes: "private" },
  budgetSummary: {
    budget: 100_000,
    cashBudget: 20_000,
    digitalBudget: 80_000,
    totalExpenses: 60_000,
    cashExpenses: 25_000,
    digitalExpenses: 35_000,
    totalRemaining: 40_000,
    cashRemaining: -5_000,
    digitalRemaining: 45_000,
    userId: "private",
  },
  entries: [
    { type: "expense", name: "Air mineral", amount: 25_000, source: "cash", transactionAt: "2026-11-01T10:00:00Z", paymentMethod: "cash", note: "internal" },
    { type: "expense", name: "Snack", amount: 35_000, source: "digital", transactionAt: "2026-11-01T11:00:00Z", payer: "private" },
    { type: "income", name: "Not modeled", amount: 25_000, source: "digital", transactionAt: "2026-11-01T12:00:00Z" },
  ],
  participants: [{ name: "private" }],
};

describe("public event view", () => {
  test("keeps budget channels and safe expense details only", () => {
    expect(normalizePublicEvent(publicPayload)).toEqual({
      event: { name: "Bukber", eventDate: "2026-11-01" },
      budgetSummary: {
        budget: 100_000,
        cashBudget: 20_000,
        digitalBudget: 80_000,
        totalExpenses: 60_000,
        cashExpenses: 25_000,
        digitalExpenses: 35_000,
        totalRemaining: 40_000,
        cashRemaining: -5_000,
        digitalRemaining: 45_000,
      },
      entries: [
        { type: "expense", name: "Air mineral", amount: 25_000, source: "cash", transactionAt: "2026-11-01T10:00:00Z" },
        { type: "expense", name: "Snack", amount: 35_000, source: "digital", transactionAt: "2026-11-01T11:00:00Z" },
      ],
    });
  });

  test("rejects inconsistent channel and total balances", () => {
    expect(normalizePublicEvent({
      ...publicPayload,
      budgetSummary: { ...publicPayload.budgetSummary, totalRemaining: 999 },
    })).toBeNull();
  });

  test("rejects incomplete event payloads", () => {
    expect(normalizePublicEvent({ event: { name: "" }, entries: [] })).toBeNull();
  });
});
