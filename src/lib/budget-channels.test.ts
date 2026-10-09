import { describe, expect, test } from "bun:test";
import { calculateBudgetChannels } from "./budget-channels";

describe("budget channels", () => {
  const transactions = [
    { quantity: 1, unitPrice: 25000, paymentMethod: "cash" },
    { quantity: 2, unitPrice: 15000, paymentMethod: "qris" },
    { quantity: 1, unitPrice: 5000, paymentMethod: "other" },
  ];

  test("leaves channel balances unset before the owner splits the budget", () => {
    expect(calculateBudgetChannels(100000, null, transactions)).toEqual({
      cashBudget: null,
      digitalBudget: null,
      cashExpenses: 25000,
      digitalExpenses: 35000,
      cashRemaining: null,
      digitalRemaining: null,
      totalExpenses: 60000,
      totalRemaining: 40000,
    });
  });

  test("keeps channel budgets equal to total and reports negative channel balance", () => {
    expect(calculateBudgetChannels(100000, 20000, transactions)).toEqual({
      cashBudget: 20000,
      digitalBudget: 80000,
      cashExpenses: 25000,
      digitalExpenses: 35000,
      cashRemaining: -5000,
      digitalRemaining: 45000,
      totalExpenses: 60000,
      totalRemaining: 40000,
    });
  });
});
