import { describe, expect, test } from "bun:test";
import { writeThenRead } from "./share-mutation";

describe("shared-link mutation readback", () => {
  test("reads the saved state even if the write response is lost", async () => {
    const order: string[] = [];
    const lostResponse = new Error("connection reset");
    const result = await writeThenRead(
      async () => { order.push("write"); throw lostResponse; },
      async () => { order.push("read"); return true; },
    );
    expect(order).toEqual(["write", "read"]);
    expect(result).toEqual({ writeError: lostResponse, state: true });
  });

  test("does not claim a state when readback fails", async () => {
    const readError = new Error("readback unavailable");
    await expect(writeThenRead(async () => {}, async () => { throw readError; })).rejects.toThrow(readError);
  });
});
