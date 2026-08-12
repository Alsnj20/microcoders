import { describe, it, expect } from "vitest";
import { createApp } from "../index.js";

describe("IPFS routes", () => {
  const app = createApp();

  describe("POST /ipfs/pin", () => {
    it("pins data and returns CID + hash", async () => {
      const res = await app.request("/ipfs/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: Buffer.from("test payload").toString("base64"),
          name: "test-pin-route",
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.cid).toBeTruthy();
      expect(body.hash).toMatch(/^0x[a-f0-9]{64}$/);
      expect(body.size).toBeGreaterThan(0);
    });

    it("returns 400 for missing data field", async () => {
      const res = await app.request("/ipfs/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "test" }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /ipfs/:cid", () => {
    it("retrieves pinned data by CID", async () => {
      // First pin
      const pinRes = await app.request("/ipfs/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: Buffer.from("retrieve me").toString("base64"),
          name: "test-retrieve-route",
        }),
      });
      const { cid } = await pinRes.json();

      // Then retrieve
      const getRes = await app.request(`/ipfs/${cid}`);
      expect(getRes.status).toBe(200);
      const body = await getRes.json();
      expect(body.cid).toBe(cid);
      expect(body.data).toBeTruthy();
      expect(Buffer.from(body.data, "base64").toString()).toBe("retrieve me");
    });
  });

  describe("DELETE /ipfs/:cid", () => {
    it("unpins data successfully", async () => {
      const pinRes = await app.request("/ipfs/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: Buffer.from("to-unpin-route").toString("base64"),
          name: "test-unpin-route",
        }),
      });
      const { cid } = await pinRes.json();

      const delRes = await app.request(`/ipfs/${cid}`, { method: "DELETE" });
      expect(delRes.status).toBe(200);
      const body = await delRes.json();
      expect(body.success).toBe(true);
    });
  });
});
