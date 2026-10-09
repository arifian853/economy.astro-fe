export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(isoStr: string): string {
  if (!isoStr) return "-";
  try {
    const d = new Date(isoStr);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return isoStr;
  }
}

export function formatPaymentMethod(method: string): string {
  switch (method) {
    case "cash":
      return "Cash";
    case "transfer":
      return "Transfer";
    case "qris":
      return "QRIS";
    case "ewallet":
      return "E-Wallet";
    case "other":
      return "Lainnya";
    default:
      return method;
  }
}
