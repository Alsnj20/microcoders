import Redis from "ioredis";
import type { SessionKeyData, SessionKeyStore } from "../types/session.js";

export function createRedisSessionKeyStore(redis: Redis): SessionKeyStore {
  const prefix = "session-key";

  function key(address: string, keyId?: string) {
    return keyId ? `${prefix}:${address}:${keyId}` : `${prefix}:${address}`;
  }

  return {
    async save(k: SessionKeyData) {
      const ttlSeconds = Math.max(1, Math.floor((k.expiry - Date.now() / 1000)));
      await redis.set(key(k.address, k.keyId), JSON.stringify(k), "EX", ttlSeconds);
    },

    async get(address, keyId) {
      const raw = await redis.get(key(address, keyId));
      return raw ? JSON.parse(raw) : null;
    },

    async list(address) {
      const pattern = `${key(address)}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length === 0) return [];

      const values = await redis.mget(...keys);
      return values.filter(Boolean).map((v) => JSON.parse(v!));
    },

    async delete(address, keyId) {
      const result = await redis.del(key(address, keyId));
      return result > 0;
    },

    async validate(address, keyId, operation) {
      const k = await this.get(address, keyId);
      if (!k) {
        return { valid: false, isActive: false, hasScope: false, expiry: 0, remainingSeconds: 0 };
      }

      const now = Math.floor(Date.now() / 1000);
      const isActive = k.expiry > now;
      const hasScope = k.scopes.includes(operation);
      const remainingSeconds = Math.max(0, k.expiry - now);

      return {
        valid: isActive && hasScope,
        isActive,
        hasScope,
        expiry: k.expiry,
        remainingSeconds,
      };
    },
  };
}
