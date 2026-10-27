import { describe, expect, test } from "bun:test";
import { formatMoneyInput, formatMoneyInputState, parseMoneyInput } from "./money-input";

describe("money input", () => {
  test("groups whole rupiah with dots", () => {
    expect(formatMoneyInput("25000")).toBe("25.000");
    expect(formatMoneyInput("12345678")).toBe("12.345.678");
  });

  test("is idempotent for already grouped input", () => {
    expect(formatMoneyInput("12.345.678")).toBe("12.345.678");
  });

  test("preserves zero and leaves an empty field empty", () => {
    expect(formatMoneyInput("0")).toBe("0");
    expect(formatMoneyInput("")).toBe("");
  });

  test("preserves the caret by digit position as grouping dots are inserted", () => {
    expect(formatMoneyInputState("1234", 4)).toEqual({ value: "1.234", caret: 5 });
    expect(formatMoneyInputState("12.345", 3)).toEqual({ value: "12.345", caret: 2 });
  });

  test("parses grouped input back to an exact major-unit string", () => {
    expect(parseMoneyInput("1.234.567")).toBe('1234567');
  });

  test("rejects empty and unsafe integer values", () => {
    expect(parseMoneyInput("")).toBeNull();
    expect(parseMoneyInput("999999999999999999999")).toBeNull();
  });
});

 test("rejects decimal rupiah and malformed paste instead of reinterpreting it", () => {
   expect(parseMoneyInput("1,5")).toBeNull();
   expect(parseMoneyInput("1.2")).toBeNull();
   expect(parseMoneyInput("-100")).toBeNull();
   expect(parseMoneyInput("abc100")).toBeNull();
 });

test('keeps invalid pasted decimals visible for validation without changing their value', () => {
  expect(formatMoneyInput('1,5')).toBe('1,5');
  expect(formatMoneyInputState('1,5', 3)).toEqual({ value: '1,5', caret: 3 });
});
