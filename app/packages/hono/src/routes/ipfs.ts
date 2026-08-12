import { Hono } from "hono";
import { z } from "zod";
import type { IpfsClient } from "../lib/ipfs.js";

const PinRequestSchema = z.object({
  data: z.string().min(1, "data is required"),
  name: z.string().min(1, "name is required"),
  mimeType: z.string().optional(),
});

export function createIpfsRoutes(ipfs: IpfsClient): Hono {
  const routes = new Hono();

  routes.post("/pin", async (c) => {
    const body = await c.req.json();
    const parsed = PinRequestSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.flatten() },
        400,
      );
    }

    const buffer = Buffer.from(parsed.data.data, "base64");
    const result = await ipfs.pin(buffer, parsed.data.name);

    return c.json({
      cid: result.cid,
      hash: result.hash,
      size: result.size,
      pinnedAt: Date.now(),
    });
  });

  routes.get("/:cid", async (c) => {
    const cid = c.req.param("cid");

    try {
      const data = await ipfs.retrieve(cid);
      return c.json({
        cid,
        data: data.toString("base64"),
        size: data.length,
        mimeType: "application/octet-stream",
      });
    } catch {
      return c.json({ code: "IPFS_RETRIEVE_FAILED", message: `Failed to retrieve CID: ${cid}` }, 404);
    }
  });

  routes.delete("/:cid", async (c) => {
    const cid = c.req.param("cid");

    try {
      await ipfs.unpin(cid);
      return c.json({ success: true, cid });
    } catch {
      return c.json({ code: "IPFS_UNPIN_FAILED", message: `Failed to unpin CID: ${cid}` }, 500);
    }
  });

  return routes;
}
