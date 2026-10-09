export type EventStatus = "upcoming" | "active" | "completed";

export type EventItem = {
  id: string;
  name: string;
  eventDate: string;
  budget: number;
  cashBudget: number | null;
  digitalBudget: number | null;
  status: EventStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  totalExpenses: number;
  participantCount: number;
};

export type Participant = {
  id: string;
  name: string;
};

export type Transaction = {
  id: string;
  eventId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  paymentMethod: "cash" | "transfer" | "qris" | "ewallet" | "other";
  note: string | null;
  transactionAt: string;
};

export type EventDetail = {
  event: Omit<EventItem, "totalExpenses" | "participantCount">;
  participants: Participant[];
  transactions: Transaction[];
};
