import { describe, expect, test } from "bun:test";
import { buildPublicShareUrl, parsePublicShareToken } from "./public-share";

const token = "a".repeat(64);
const shortCode = "aB3dE5fG7hJ9kLmN2pQ4rS";

describe("public share links", () => {
  test("keeps the bearer token in the URL fragment", () => {
    expect(buildPublicShareUrl("https://economy.example", token)).toBe(
      `https://economy.example/share/#${token}`,
    );
  });

  test("accepts a compact share code in the URL fragment", () => {
    expect(buildPublicShareUrl("https://economy.example", shortCode)).toBe(
      `https://economy.example/share/#${shortCode}`,
    );
    expect(parsePublicShareToken(`#${shortCode}`)).toBe(shortCode);
  });

  test("rejects malformed tokens before building or reading a share URL", () => {
    expect(buildPublicShareUrl("https://economy.example", "short-token")).toBeNull();
    expect(parsePublicShareToken("#short-token")).toBeNull();
    expect(parsePublicShareToken(`?token=${token}`)).toBeNull();
  });

  test("reads only a valid fragment token", () => {
    expect(parsePublicShareToken(`#${token}`)).toBe(token);
  });
});
