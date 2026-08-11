import { create } from "kubo-rpc-client";
import { createHash } from "node:crypto";

export interface PinResult {
  cid: string;
  hash: string;
  size: number;
}

export interface IpfsClient {
  pin(data: Buffer, name: string): Promise<PinResult>;
  retrieve(cid: string): Promise<Buffer>;
  unpin(cid: string): Promise<void>;
}

export function createIpfsClient(config: { apiUrl: string }): IpfsClient {
  const ipfs = create(config.apiUrl);

  return {
    async pin(data: Buffer, name: string): Promise<PinResult> {
      const hash = "0x" + createHash("sha256").update(data).digest("hex");

      const result = await ipfs.add(data, {
        pin: true,
        wrapWithDirectory: false,
      });

      return {
        cid: result.cid.toString(),
        hash,
        size: result.size,
      };
    },

    async retrieve(cid: string): Promise<Buffer> {
      const chunks: Uint8Array[] = [];
      for await (const chunk of ipfs.cat(cid)) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    },

    async unpin(cid: string): Promise<void> {
      await ipfs.pin.rm(cid);
    },
  };
}
