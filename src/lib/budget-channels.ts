import { multiplyMoney, sumMoney, subtractMoney, fromMinor, toMinor, type Money } from './money';
export type BudgetChannelTransaction = {
  quantity: number;
  unitPrice: Money;
  paymentMethod: string;
};

export type BudgetChannelSummary = {
  cashBudget: Money | null;
  digitalBudget: Money | null;
  cashExpenses: Money;
  digitalExpenses: Money;
  cashRemaining: Money | null;
  digitalRemaining: Money | null;
  totalExpenses: Money;
  totalRemaining: Money;
};

export function calculateBudgetChannels(
  budget: Money,
  cashBudget: Money | null,
  transactions: BudgetChannelTransaction[],
  currency = 'IDR',
): BudgetChannelSummary {
  const expenses = transactions.map(tx => ({ amount: multiplyMoney(tx.unitPrice, tx.quantity, currency), cash: tx.paymentMethod === 'cash' }));
  const totalExpenses = sumMoney(expenses.map(tx => tx.amount), currency);
  const cashExpenses = sumMoney(expenses.filter(tx => tx.cash).map(tx => tx.amount), currency);
  const digitalExpenses = sumMoney(expenses.filter(tx => !tx.cash).map(tx => tx.amount), currency);
  const digitalBudget = cashBudget === null ? null : subtractMoney(budget, cashBudget, currency);
  return {
    cashBudget: cashBudget === null ? null : fromMinor(toMinor(cashBudget, currency), currency),
    digitalBudget,
    cashExpenses,
    digitalExpenses,
    cashRemaining: cashBudget === null ? null : subtractMoney(cashBudget, cashExpenses, currency),
    digitalRemaining: digitalBudget === null ? null : subtractMoney(digitalBudget, digitalExpenses, currency),
    totalExpenses,
    totalRemaining: subtractMoney(budget, totalExpenses, currency),
  };
}
