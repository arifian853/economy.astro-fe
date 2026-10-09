import { describe, expect, test } from "bun:test";
import { canCloseEventModal } from "./event-modal";

describe("event modal dismissal", () => {
  test("allows dismissal only from the top-right close button", () => {
    expect(canCloseEventModal("close-button")).toBe(true);
    expect(canCloseEventModal("backdrop")).toBe(false);
    expect(canCloseEventModal("escape")).toBe(false);
    expect(canCloseEventModal("cancel-button")).toBe(false);
    expect(canCloseEventModal("form-submit")).toBe(false);
  });
});
