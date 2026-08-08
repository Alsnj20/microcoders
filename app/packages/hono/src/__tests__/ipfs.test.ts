import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createIpfsClient, type IpfsClient } from "../lib/ipfs.js";

describe("IPFS client", () => {
  let client: IpfsClient;

  beforeAll(() => {
    client = createIpfsClient({ apiUrl: "http://localhost:5001" });
  });

  describe("pin", () => {
    it("pins data and returns a CID and SHA-256 hash", async () => {
      const data = Buffer.from("hello memorychain");
      const result = await client.pin(data, "test-pin");

      expect(result.cid).toBeTruthy();
      // CIDv0 (Qm...) or CIDv1 (bafy...) depending on Kubo config
      expect(result.cid).toMatch(/^(Qm|bafy)/);
      expect(result.hash).toBeTruthy();
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.size).toBeGreaterThan(0);
    });

    it("returns different CIDs for different data", async () => {
      const result1 = await client.pin(Buffer.from("data-one"), "test-1");
      const result2 = await client.pin(Buffer.from("data-two"), "test-2");

      expect(result1.cid).not.toBe(result2.cid);
    });

    it("returns same CID for same data (content-addressed)", async () => {
      const data = Buffer.from("duplicate-content");
      const result1 = await client.pin(data, "test-dup-1");
      const result2 = await client.pin(data, "test-dup-2");

      expect(result1.cid).toBe(result2.cid);
    });
  });

  describe("retrieve", () => {
    it("retrieves pinned data by CID", async () => {
      const original = Buffer.from("retrieve me");
      const { cid } = await client.pin(original, "test-retrieve");

      const retrieved = await client.retrieve(cid);

      expect(retrieved).toEqual(original);
    });

    it("retrieves binary data correctly", async () => {
      const original = Buffer.from(new Uint8Array([0, 1, 2, 255, 128, 64]));
      const { cid } = await client.pin(original, "test-binary");

      const retrieved = await client.retrieve(cid);

      expect(retrieved).toEqual(original);
    });
  });

  describe("unpin", () => {
    it("unpins data by CID without throwing", async () => {
      const { cid } = await client.pin(Buffer.from("to-unpin"), "test-unpin");

      await expect(client.unpin(cid)).resolves.toBeUndefined();
    });
  });
});
