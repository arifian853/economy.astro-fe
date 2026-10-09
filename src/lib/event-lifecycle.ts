import type { EventStatus } from "../types";

export type EventLifecycleView = {
  isArchived: boolean;
  canComplete: boolean;
  canEditEvent: boolean;
  canEditLedger: boolean;
  canDeleteEvent: boolean;
  canManagePublicLink: true;
};

export function getEventLifecycleView(status: EventStatus): EventLifecycleView {
  const isArchived = status === "completed";
  return {
    isArchived,
    canComplete: !isArchived,
    canEditEvent: !isArchived,
    canEditLedger: !isArchived,
    canDeleteEvent: true,
    canManagePublicLink: true,
  };
}

export type BudgetOutcome =
  | { kind: "surplus"; amount: number }
  | { kind: "balanced"; amount: 0 }
  | { kind: "deficit"; amount: number };

export function getBudgetOutcome(budget: number, totalExpenses: number): BudgetOutcome {
  const balance = budget - totalExpenses;
  if (balance > 0) return { kind: "surplus", amount: balance };
  if (balance < 0) return { kind: "deficit", amount: Math.abs(balance) };
  return { kind: "balanced", amount: 0 };
}
