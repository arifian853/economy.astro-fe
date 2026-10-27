import type { Money } from '../lib/money';
export type EventStatus = "upcoming" | "active" | "completed";

// Optional during rollout; absent fields must never imply a historical snapshot.
export type InitialBudgetSnapshot = {
  initialBudget?: Money;
  initialBudgetKnown?: boolean;
};

export type EventCurrency = {
  currencyMode?: 'domestic' | 'international';
  baseCurrency?: string;
  currencyLocked?: boolean;
  fxReferenceRateToIdr?: string | null;
  fxReferenceDate?: string | null;
  fxReferenceProvider?: string | null;
};
export type TransactionFx = {
  baseCurrency?: string;
  fxRateToIdr?: string | null;
  fxRateDate?: string | null;
  fxRateProvider?: string | null;
  idrEquivalent?: Money | null;
};
export type EventItem = EventCurrency & InitialBudgetSnapshot & {
  id: string;
  name: string;
  eventDate: string;
  budget: Money;
  cashBudget: Money | null;
  digitalBudget: Money | null;
  status: EventStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  totalExpenses: Money;
  participantCount: number;
};

export type Participant = {
  id: string;
  name: string;
};

export type Transaction = TransactionFx & {
  id: string;
  eventId: string;
  name: string;
  quantity: number;
  unitPrice: Money;
  paymentMethod: "cash" | "transfer" | "qris" | "ewallet" | "other";
  note: string | null;
  transactionAt: string;
};

export type EventDetail = {
  event: Omit<EventItem, "totalExpenses" | "participantCount">;
  participants: Participant[];
  transactions: Transaction[];
};
