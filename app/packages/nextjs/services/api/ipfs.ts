import { api } from "./client";

export async function pinToIpfs(dataB64: string, name: string) {
  const res = await api.ipfs.pin.$post({
    json: { data: dataB64, name },
  });
  if (!res.ok) {
    const error = (await res.json()) as { message?: string };
    throw new Error(error.message || "Failed to pin to IPFS");
  }
  return res.json();
}

export async function retrieveFromIpfs(cid: string): Promise<string> {
  const res = await api.ipfs[":cid"].$get({
    param: { cid },
  });
  if (!res.ok) {
    const error = (await res.json()) as { message?: string };
    throw new Error(error.message || `Failed to retrieve from IPFS: ${cid}`);
  }
  const result = (await res.json()) as { data: string };
  return result.data; // returns base64 encoded content
}

export async function unpinFromIpfs(cid: string) {
  const res = await api.ipfs[":cid"].$delete({
    param: { cid },
  });
  if (!res.ok) {
    const error = (await res.json()) as { message?: string };
    throw new Error(error.message || `Failed to unpin from IPFS: ${cid}`);
  }
  return res.json();
}
