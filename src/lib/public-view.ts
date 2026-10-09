export type PublicEventEntry = {
  type: "expense";
  name: string;
  amount: number;
  source: "cash" | "digital";
  transactionAt: string;
};

export type PublicBudgetSummary = {
  budget: number;
  cashBudget: number | null;
  digitalBudget: number | null;
  totalExpenses: number;
  cashExpenses: number;
  digitalExpenses: number;
  totalRemaining: number;
  cashRemaining: number | null;
  digitalRemaining: number | null;
};

export type PublicEventData = {
  event: { name: string; eventDate: string };
  budgetSummary: PublicBudgetSummary;
  entries: PublicEventEntry[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const isMoney = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const isNullableMoney = (value: unknown): value is number | null => value === null || isMoney(value);

export function normalizePublicEvent(value: unknown): PublicEventData | null {
  if (!isRecord(value) || !isRecord(value.event) || !isRecord(value.budgetSummary) || !Array.isArray(value.entries)) return null;
  const { name, eventDate } = value.event;
  if (typeof name !== "string" || !name.trim() || typeof eventDate !== "string" || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(eventDate)) return null;

  const raw = value.budgetSummary;
  const { budget, cashBudget, digitalBudget, totalExpenses, cashExpenses, digitalExpenses, totalRemaining, cashRemaining, digitalRemaining } = raw;
  if (!isMoney(budget) || !isNullableMoney(cashBudget) || !isNullableMoney(digitalBudget) ||
      !isMoney(totalExpenses) || !isMoney(cashExpenses) || !isMoney(digitalExpenses) ||
      typeof totalRemaining !== "number" || !Number.isSafeInteger(totalRemaining) ||
      !(cashRemaining === null || (typeof cashRemaining === "number" && Number.isSafeInteger(cashRemaining))) ||
      !(digitalRemaining === null || (typeof digitalRemaining === "number" && Number.isSafeInteger(digitalRemaining)))) return null;

  const splitConfigured = cashBudget !== null && digitalBudget !== null;
  if ((cashBudget === null) !== (digitalBudget === null) ||
      (splitConfigured && cashBudget + digitalBudget !== budget) ||
      totalExpenses !== cashExpenses + digitalExpenses || totalRemaining !== budget - totalExpenses ||
      (splitConfigured && (cashRemaining !== cashBudget - cashExpenses || digitalRemaining !== digitalBudget - digitalExpenses)) ||
      (!splitConfigured && (cashRemaining !== null || digitalRemaining !== null))) return null;

  const entries = value.entries.flatMap((entry): PublicEventEntry[] => {
    if (!isRecord(entry)) return [];
    const { type, name: entryName, amount, source, transactionAt } = entry;
    if (type !== "expense" || typeof entryName !== "string" || !entryName.trim() || !isMoney(amount) ||
        (source !== "cash" && source !== "digital") || typeof transactionAt !== "string" || !transactionAt) return [];
    return [{ type, name: entryName.trim(), amount, source, transactionAt }];
  });

  const entryTotal = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const entryCash = entries.filter((entry) => entry.source === "cash").reduce((sum, entry) => sum + entry.amount, 0);
  if (entryTotal !== totalExpenses || entryCash !== cashExpenses || entryTotal - entryCash !== digitalExpenses) return null;

  return {
    event: { name: name.trim(), eventDate },
    budgetSummary: { budget, cashBudget, digitalBudget, totalExpenses, cashExpenses, digitalExpenses, totalRemaining, cashRemaining, digitalRemaining },
    entries,
  };
}
