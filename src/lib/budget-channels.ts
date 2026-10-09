export type BudgetChannelTransaction = {
  quantity: number;
  unitPrice: number;
  paymentMethod: string;
};

export type BudgetChannelSummary = {
  cashBudget: number | null;
  digitalBudget: number | null;
  cashExpenses: number;
  digitalExpenses: number;
  cashRemaining: number | null;
  digitalRemaining: number | null;
  totalExpenses: number;
  totalRemaining: number;
};

export function calculateBudgetChannels(
  budget: number,
  cashBudget: number | null,
  transactions: BudgetChannelTransaction[],
): BudgetChannelSummary {
  const totals = transactions.reduce(
    (sum, tx) => {
      const amount = tx.quantity * tx.unitPrice;
      sum.totalExpenses += amount;
      if (tx.paymentMethod === "cash") sum.cashExpenses += amount;
      else sum.digitalExpenses += amount;
      return sum;
    },
    { totalExpenses: 0, cashExpenses: 0, digitalExpenses: 0 },
  );

  const splitConfigured = cashBudget !== null;
  const digitalBudget = splitConfigured ? budget - cashBudget : null;

  return {
    cashBudget,
    digitalBudget,
    cashExpenses: totals.cashExpenses,
    digitalExpenses: totals.digitalExpenses,
    cashRemaining: splitConfigured ? cashBudget - totals.cashExpenses : null,
    digitalRemaining: splitConfigured ? digitalBudget! - totals.digitalExpenses : null,
    totalExpenses: totals.totalExpenses,
    totalRemaining: budget - totals.totalExpenses,
  };
}
