import { subtractMoney, compareMoney, absMoney, type Money } from './money';
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
  | { kind: "surplus"; amount: Money }
  | { kind: "balanced"; amount: Money }
  | { kind: "deficit"; amount: Money };

export function getBudgetOutcome(budget: Money, totalExpenses: Money, currency = 'IDR'): BudgetOutcome {
  const balance = subtractMoney(budget, totalExpenses, currency);
  const comparison = compareMoney(balance, '0', currency);
  if (comparison > 0) return { kind: "surplus", amount: balance };
  if (comparison < 0) return { kind: "deficit", amount: absMoney(balance, currency) };
  return { kind: "balanced", amount: balance };
}
