const wholeRupiahFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export function formatMoneyInput(value: string | number | bigint): string {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";

  try {
    return wholeRupiahFormatter.format(BigInt(digits));
  } catch {
    return "";
  }
}

export function formatMoneyInputState(
  value: string,
  caret: number,
): { value: string; caret: number } {
  const digitsBeforeCaret = value.slice(0, caret).replace(/\D/g, "").length;
  const formatted = formatMoneyInput(value);
  let nextCaret = 0;
  let countedDigits = 0;

  while (nextCaret < formatted.length && countedDigits < digitsBeforeCaret) {
    if (/\d/.test(formatted[nextCaret])) countedDigits += 1;
    nextCaret += 1;
  }

  return { value: formatted, caret: nextCaret };
}

export function parseMoneyInput(value: string): number | null {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;

  const amount = Number(digits);
  return Number.isSafeInteger(amount) ? amount : null;
}
