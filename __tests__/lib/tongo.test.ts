// __tests__/lib/tongo.test.ts
import {
  generateTongoPrivateKey,
  getOrCreateTongoKey,
  parseTongoQr,
  isValidTongoAddress,
} from "@/lib/tongo";
import * as SecureStore from "expo-secure-store";

// Clear mock storage between tests
beforeEach(() => {
  (SecureStore as any).__clearStore();
});

describe("generateTongoPrivateKey", () => {
  it("returns a 66-character hex string starting with 0x", async () => {
    const key = await generateTongoPrivateKey();
    expect(key).toMatch(/^0x[0-9a-f]{64}$/);
    expect(key.length).toBe(66);
  });

  it("is deterministic with mocked crypto (same bytes -> same key)", async () => {
    const key1 = await generateTongoPrivateKey();
    const key2 = await generateTongoPrivateKey();
    // Our mock returns the same bytes every time
    expect(key1).toBe(key2);
  });
});

describe("getOrCreateTongoKey", () => {
  it("generates and stores a new key when none exists", async () => {
    const key = await getOrCreateTongoKey();
    expect(key).toMatch(/^0x[0-9a-f]{64}$/);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "spiceup.tongo.privateKey",
      key
    );
  });

  it("returns the stored key without generating when one exists", async () => {
    const existingKey = "0x" + "ab".repeat(32);
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(existingKey);

    const key = await getOrCreateTongoKey();
    expect(key).toBe(existingKey);
    // setItemAsync should NOT be called — no new key generated
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });
});

describe("parseTongoQr", () => {
  it('parses valid "tongo:x:y" format', () => {
    const result = parseTongoQr("tongo:123:456");
    expect(result).toEqual({ x: 123n, y: 456n });
  });

  it("parses large bigint values", () => {
    const result = parseTongoQr(
      "tongo:999999999999999999:888888888888888888"
    );
    expect(result).toEqual({
      x: 999999999999999999n,
      y: 888888888888888888n,
    });
  });

  it("returns null for invalid prefix", () => {
    expect(parseTongoQr("notongo:1:2")).toBeNull();
  });

  it("returns null for missing y coordinate", () => {
    expect(parseTongoQr("tongo:1")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseTongoQr("")).toBeNull();
  });

  it("returns null for non-numeric coordinates", () => {
    expect(parseTongoQr("tongo:abc:def")).toBeNull();
  });

  it("returns null for tongo: with trailing colon only", () => {
    expect(parseTongoQr("tongo:")).toBeNull();
  });
});

describe("isValidTongoAddress", () => {
  it("returns true for valid tongo addresses", () => {
    expect(isValidTongoAddress("tongo:123:456")).toBe(true);
  });

  it("returns false for invalid formats", () => {
    expect(isValidTongoAddress("")).toBe(false);
    expect(isValidTongoAddress("0x1234")).toBe(false);
    expect(isValidTongoAddress("tongo:abc:def")).toBe(false);
    expect(isValidTongoAddress("tongo:1")).toBe(false);
  });
});
