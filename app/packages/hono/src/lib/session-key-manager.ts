import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { type Hex } from "viem";
import Redis from "ioredis";

export interface SessionKeyInfo {
  keyId: string;
  address: Hex;
  privateKey: Hex;
  ownerAddress: Hex;
  createdAt: number;
}

export interface SessionKeyManager {
  generate(ownerAddress: Hex): Promise<SessionKeyInfo>;
  get(keyId: string): Promise<SessionKeyInfo | null>;
  getByOwner(ownerAddress: Hex): Promise<SessionKeyInfo[]>;
  delete(keyId: string): Promise<boolean>;
}

export function createRedisSessionKeyManager(redis: Redis): SessionKeyManager {
  const prefix = "sk-manager";

  function key(keyId: string) {
    return `${prefix}:${keyId}`;
  }

  function ownerIndex(ownerAddress: Hex) {
    return `${prefix}:owner:${ownerAddress.toLowerCase()}`;
  }

  return {
    async generate(ownerAddress: Hex): Promise<SessionKeyInfo> {
      const privateKey = generatePrivateKey();
      const account = privateKeyToAccount(privateKey);
      const keyId = `sk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const info: SessionKeyInfo = {
        keyId,
        address: account.address,
        privateKey,
        ownerAddress,
        createdAt: Math.floor(Date.now() / 1000),
      };

      await redis.set(key(keyId), JSON.stringify(info));
      await redis.sadd(ownerIndex(ownerAddress), keyId);

      return info;
    },

    async get(keyId: string): Promise<SessionKeyInfo | null> {
      const raw = await redis.get(key(keyId));
      return raw ? JSON.parse(raw) : null;
    },

    async getByOwner(ownerAddress: Hex): Promise<SessionKeyInfo[]> {
      const keyIds = await redis.smembers(ownerIndex(ownerAddress));
      if (keyIds.length === 0) return [];

      const results = await Promise.all(keyIds.map((id) => redis.get(key(id))));
      return results.filter(Boolean).map((v) => JSON.parse(v!));
    },

    async delete(keyId: string): Promise<boolean> {
      const info = await this.get(keyId);
      if (!info) return false;

      await redis.del(key(keyId));
      await redis.srem(ownerIndex(info.ownerAddress), keyId);
      return true;
    },
  };
}
