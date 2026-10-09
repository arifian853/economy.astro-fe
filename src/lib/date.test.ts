import { describe, expect, test } from "bun:test";
import { formatLocalDateInput } from "./date";

describe("formatLocalDateInput", () => {
  test("uses the WIB calendar day after UTC has crossed midnight", () => {
    const justAfterMidnightWib = new Date("2026-10-06T17:30:00.000Z");

    expect(formatLocalDateInput(justAfterMidnightWib)).toBe("2026-10-07");
  });

  test("handles a year boundary in WIB", () => {
    const newYearWib = new Date("2026-12-31T17:00:00.000Z");

    expect(formatLocalDateInput(newYearWib)).toBe("2027-01-01");
  });

  test("pads month and day for date inputs", () => {
    const localMorning = new Date("2026-03-08T02:00:00.000Z");

    expect(formatLocalDateInput(localMorning)).toBe("2026-03-08");
  });
});
