"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useGlobalState } from "~~/services/store/store";
import { api } from "~~/services/api/client";
import { pinToIpfs, retrieveFromIpfs } from "~~/services/api/ipfs";
import { encryptData, decryptData, createWalletEnvelope, decryptWalletEnvelope } from "~~/services/crypto/envelope";
import { generateKData } from "~~/services/crypto/keys";
import { arrayBufferToBase64, base64ToArrayBuffer } from "~~/services/crypto/utils";
import type { Collection, CreateMemory, Memory, UpdateMemory } from "../types/memory";

const typeToNum = (type: string): number => {
  switch (type) {
    case "documento":
      return 0;
    case "texto":
      return 1;
    case "codigo":
      return 2;
    case "pdf":
      return 3;
    case "enlace":
    case "imagen":
      return 4;
    default:
      return 1;
  }
};

const numToType = (num: number): string => {
  switch (num) {
    case 0:
      return "documento";
    case 1:
      return "texto";
    case 2:
      return "codigo";
    case 3:
      return "pdf";
    case 4:
      return "enlace";
    default:
      return "texto";
  }
};

const INITIAL_COLLECTIONS: Collection[] = [
  { id: "all", name: "Todas las memorias", icon: "grid_view", count: 0 },
  { id: "favorites", name: "Favoritas", icon: "star", count: 0 },
];

export function useMemory() {
  const { session } = useGlobalState();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [collections] = useState<Collection[]>(INITIAL_COLLECTIONS);
  const [selectedCollection, setSelectedCollection] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "name">("recent");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMemories = useCallback(async () => {
    if (!session.isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.memories.$get();
      if (!res.ok) throw new Error("Failed to fetch memories metadata");
      const data = (await res.json()) as any;

      const mappedMemories: Memory[] = (data.memories || []).map((m: any) => ({
        id: m.memoryId,
        title: m.name,
        description: "",
        type: numToType(m.memoryType) as any,
        collectionId: "all",
        isFavorite: false,
        cid: m.cid,
        hash: m.hash,
        createdAt: new Date(m.createdAt * 1000).toISOString().split("T")[0],
        updatedAt: new Date(m.createdAt * 1000).toISOString().split("T")[0],
      }));

      setMemories(mappedMemories);
    } catch (err: any) {
      console.error("Fetch memories error:", err);
      setError(err.message || "Failed to load memories");
    } finally {
      setLoading(false);
    }
  }, [session.isAuthenticated]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const getMemory = useCallback(
    async (id: string): Promise<Memory | null> => {
      // Find metadata locally first
      const localMeta = memories.find(m => m.id === id);
      if (!localMeta || !localMeta.cid) return null;

      try {
        if (localMeta.content) return localMeta; // already decrypted

        // 1. Fetch IPFS envelope
        const base64Data = await retrieveFromIpfs(localMeta.cid);
        const jsonStr = new TextDecoder().decode(base64ToArrayBuffer(base64Data));
        const envelope = JSON.parse(jsonStr);

        // 2. Decrypt wallet envelope
        if (!session.kWallet) {
          throw new Error("Clave de wallet no disponible. Por favor, reautentíquese.");
        }
        const kData = await decryptWalletEnvelope(base64ToArrayBuffer(envelope.walletEnvelope), session.kWallet);

        // 3. Decrypt content
        const plaintext = await decryptData(base64ToArrayBuffer(envelope.ciphertext), kData);

        const decrypted = {
          ...localMeta,
          content: plaintext,
          description: localMeta.description || plaintext.slice(0, 100) + "...",
        };

        // Cache decrypted content locally
        setMemories(prev => prev.map(m => (m.id === id ? decrypted : m)));
        return decrypted;
      } catch (err: any) {
        console.error("Retrieve and decrypt memory error:", err);
        throw err;
      }
    },
    [memories, session.kWallet],
  );

  const createMemory = useCallback(
    async (data: CreateMemory): Promise<Memory> => {
      if (!session.kWallet) {
        throw new Error("Clave de wallet no disponible. Inicie sesión de nuevo.");
      }

      setLoading(true);
      setError(null);

      try {
        // 1. Generate K_data key
        const kData = generateKData();

        // 2. Encrypt memory content
        const ciphertext = await encryptData(data.content || "", kData);

        // 3. Create envelope for user's wallet
        const walletEnvelope = await createWalletEnvelope(kData, session.kWallet);

        // 4. Standard JSON payload for IPFS
        const ipfsPayload = {
          ciphertext: arrayBufferToBase64(ciphertext),
          walletEnvelope: arrayBufferToBase64(walletEnvelope),
          recoveryEnvelope: "", // Setup later in recovery phase
        };

        const rawJsonBytes = new TextEncoder().encode(JSON.stringify(ipfsPayload));
        const base64Payload = arrayBufferToBase64(rawJsonBytes);

        // 5. Upload to IPFS
        const ipfsResult = await pinToIpfs(base64Payload, data.title);

        // 6. Write to Hono API (Smart contract execution proxy)
        const res = await api.memories.create.$post({
          json: {
            name: data.title,
            cid: ipfsResult.cid,
            hash: ipfsResult.hash,
            memoryType: typeToNum(data.type),
            visibility: 0, // Default to private/owner visibility
          },
        });

        if (!res.ok) {
          const errBody = (await res.json()) as any;
          throw new Error(errBody.message || "Failed to register memory on-chain");
        }

        const newMemoryData = (await res.json()) as any;
        const newMemory: Memory = {
          id: newMemoryData.memoryId,
          title: data.title,
          description: data.description || "",
          type: data.type,
          content: data.content,
          collectionId: "all",
          isFavorite: false,
          cid: newMemoryData.cid,
          hash: newMemoryData.hash,
          createdAt: new Date().toISOString().split("T")[0],
          updatedAt: new Date().toISOString().split("T")[0],
        };

        setMemories(prev => [newMemory, ...prev]);
        return newMemory;
      } catch (err: any) {
        console.error("Create memory error:", err);
        setError(err.message || "Failed to create memory");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [session.kWallet],
  );

  const updateMemory = useCallback(
    async (id: string, data: UpdateMemory) => {
      if (!session.kWallet) {
        throw new Error("Clave de wallet no disponible. Inicie sesión de nuevo.");
      }

      setLoading(true);
      setError(null);

      try {
        const localMeta = memories.find(m => m.id === id);
        if (!localMeta) throw new Error("Memory not found locally");

        // 1. Generate K_data
        const kData = generateKData();
        // 2. Encrypt
        const ciphertext = await encryptData(data.content || "", kData);
        // 3. Envelope
        const walletEnvelope = await createWalletEnvelope(kData, session.kWallet);

        const ipfsPayload = {
          ciphertext: arrayBufferToBase64(ciphertext),
          walletEnvelope: arrayBufferToBase64(walletEnvelope),
          recoveryEnvelope: "",
        };

        const rawJsonBytes = new TextEncoder().encode(JSON.stringify(ipfsPayload));
        const base64Payload = arrayBufferToBase64(rawJsonBytes);

        // 4. Pin to IPFS
        const ipfsResult = await pinToIpfs(base64Payload, data.title || localMeta.title);

        // 5. Update on Hono API
        const res = await api.memories[":id"].$put({
          param: { id },
          json: {
            cid: ipfsResult.cid,
            hash: ipfsResult.hash,
          },
        });

        if (!res.ok) {
          const errBody = (await res.json()) as any;
          throw new Error(errBody.message || "Failed to update memory on-chain");
        }

        const updatedData = (await res.json()) as any;

        setMemories(prev =>
          prev.map(m =>
            m.id === id
              ? {
                  ...m,
                  title: data.title || m.title,
                  description: data.description || m.description,
                  content: data.content,
                  cid: updatedData.cid,
                  hash: updatedData.hash,
                  updatedAt: new Date().toISOString().split("T")[0],
                }
              : m,
          ),
        );
      } catch (err: any) {
        console.error("Update memory error:", err);
        setError(err.message || "Failed to update memory");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [memories, session.kWallet],
  );

  const deleteMemory = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await api.memories[":id"].archive.$post({
        param: { id },
      });
      if (!res.ok) throw new Error("Failed to archive memory on-chain");
      setMemories(prev => prev.filter(m => m.id !== id));
    } catch (err: any) {
      console.error("Delete memory error:", err);
      setError(err.message || "Failed to delete memory");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setMemories(prev => prev.map(m => (m.id === id ? { ...m, isFavorite: !m.isFavorite } : m)));
  }, []);

  const getMemoriesFiltered = useCallback(() => {
    let filtered = [...memories];

    if (selectedCollection === "favorites") {
      filtered = filtered.filter(m => m.isFavorite);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        m => m.title.toLowerCase().includes(query) || m.description?.toLowerCase().includes(query),
      );
    }

    filtered.sort((a, b) => {
      if (sortBy === "recent") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return a.title.localeCompare(b.title);
    });

    return filtered;
  }, [memories, selectedCollection, searchQuery, sortBy]);

  const filteredMemories = useMemo(() => getMemoriesFiltered(), [getMemoriesFiltered]);

  const totalByCollection = useMemo(() => {
    const counts: Record<string, number> = { all: memories.length, favorites: 0 };
    for (const m of memories) {
      if (m.isFavorite) counts.favorites = (counts.favorites || 0) + 1;
    }
    return counts;
  }, [memories]);

  return {
    memories: filteredMemories,
    collections,
    selectedCollection,
    setSelectedCollection,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    getMemory,
    createMemory,
    updateMemory,
    deleteMemory,
    toggleFavorite,
    totalByCollection,
    loading,
    error,
  };
}
