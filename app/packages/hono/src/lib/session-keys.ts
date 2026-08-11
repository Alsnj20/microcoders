import Redis from "ioredis";
import type { SessionKeyData, SessionKeyStore } from "../types/session.js";

export function createRedisSessionKeyStore(redis: Redis): SessionKeyStore {
  const prefix = "session-key";

  function key(address: string, keyId?: string) {
    return keyId ? `${prefix}:${address}:${keyId}` : `${prefix}:${address}`;
  }

  return {
    async save(k: SessionKeyData) {
      const ttlSeconds = Math.max(1, Math.floor(k.expiry - Date.now() / 1000));
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

export function createMemorySessionKeyStore(): SessionKeyStore {
  const store = new Map<string, SessionKeyData>();

  function key(address: string, keyId?: string) {
    const addr = address.toLowerCase();
    return keyId ? `${addr}:${keyId}` : addr;
  }

  return {
    async save(k: SessionKeyData) {
      store.set(key(k.address, k.keyId), k);
    },

    async get(address, keyId) {
      const entry = store.get(key(address, keyId));
      if (!entry) return null;
      if (entry.expiry <= Math.floor(Date.now() / 1000)) {
        store.delete(key(address, keyId));
        return null;
      }
      return entry;
    },

    async list(address) {
      const addr = address.toLowerCase();
      const now = Math.floor(Date.now() / 1000);
      const results: SessionKeyData[] = [];
      for (const [k, v] of store.entries()) {
        if (k.startsWith(`${addr}:`)) {
          if (v.expiry > now) {
            results.push(v);
          } else {
            store.delete(k);
          }
        }
      }
      return results;
    },

    async delete(address, keyId) {
      return store.delete(key(address, keyId));
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
