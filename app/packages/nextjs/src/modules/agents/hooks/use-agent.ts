"use client";

import { useCallback, useEffect, useState } from "react";
import { useGlobalState } from "~~/services/store/store";
import { api } from "~~/services/api/client";
import { pinToIpfs, retrieveFromIpfs } from "~~/services/api/ipfs";
import { encryptData, decryptData, createWalletEnvelope, decryptWalletEnvelope } from "~~/services/crypto/envelope";
import { generateKData } from "~~/services/crypto/keys";
import { arrayBufferToBase64, base64ToArrayBuffer } from "~~/services/crypto/utils";
import type { Agent, AgentChatMessage, Conversation, CreateAgent, UpdateAgent } from "../types/agent";
import { resolveMemoryTitleSafe } from "~~/src/modules/memories/services/memory-title";

export interface ConnectedMemory {
  memoryId: string;
  name: string;
}

// Agent blueprint = all rich metadata stored encrypted on IPFS
// On-chain only stores: name, description (plain), cid, hash
interface AgentBlueprint {
  name?: string;
  personality: string;
  instructions: string;
  description?: string;
  icon: string;
  persistentMemory: boolean;
}

function generateDevHash(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function useAgent() {
  const { session, setCreditBalance } = useGlobalState();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const refreshBalance = useCallback(async () => {
    try {
      const res = await api.credits.balance.$get();
      if (res.ok) {
        const data = await res.json();
        setCreditBalance(data.balance ?? 0);
      }
    } catch {}
  }, [setCreditBalance]);
  const [messages, setMessages] = useState<Record<string, AgentChatMessage[]>>({});
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || null;
  const agentConversations = conversations.filter(c => c.agentId === selectedAgentId);
  const currentMessages = selectedConversationId ? messages[selectedConversationId] || [] : [];

  // ─── Fetch agents list from backend ────────────────────────────────────────
  const fetchAgents = useCallback(async () => {
    if (!session.isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.agents.$get();
      if (!res.ok) throw new Error("Failed to fetch agents");
      const data = (await res.json()) as any;

      const mapped: Agent[] = (data.agents || [])
        .map((a: any) => ({
          id: a.agentId,
          name: a.name,
          description: a.description || "",
          icon: "🤖",
          personality: "",
          instructions: "",
          connectedMemories: [],
          persistentMemory: true,
          cid: a.cid,
          hash: a.hash,
          isArchived: a.status === 1,
          createdAt: new Date(a.createdAt * 1000).toISOString().split("T")[0],
          updatedAt: new Date((a.updatedAt || a.createdAt) * 1000).toISOString().split("T")[0],
        }));

      // Decrypt blueprints from IPFS for each agent (if kWallet available)
      let resolved: Agent[];
      if (session.kWallet) {
        const decrypted = await Promise.allSettled(
          mapped.map(async (agent) => {
            if (!agent.cid || agent.cid.startsWith("dev-")) return agent;
            try {
              const base64Data = await retrieveFromIpfs(agent.cid);
              const jsonStr = new TextDecoder().decode(base64ToArrayBuffer(base64Data));
              const envelope = JSON.parse(jsonStr);
              const kData = await decryptWalletEnvelope(base64ToArrayBuffer(envelope.walletEnvelope), session.kWallet!);
              const plaintext = await decryptData(base64ToArrayBuffer(envelope.ciphertext), kData);
              const blueprint: AgentBlueprint = JSON.parse(plaintext);
              return {
                ...agent,
                name: blueprint.name || agent.name,
                description: blueprint.description || agent.description || "",
                icon: blueprint.icon || "🤖",
                personality: blueprint.personality || "",
                instructions: blueprint.instructions || "",
                persistentMemory: blueprint.persistentMemory ?? true,
              };
            } catch {
              return agent;
            }
          }),
        );
        resolved = decrypted.map(r => r.status === "fulfilled" ? r.value : mapped[decrypted.indexOf(r)]);
      } else {
        resolved = mapped;
      }

      // Populate connectedMemories from on-chain ContextRegistry
      const withLinks = await Promise.allSettled(
        resolved.map(async (agent) => {
          try {
            const memoryIds = await fetchLinkedMemories(agent.id);
            const memories: ConnectedMemory[] = [];
            for (const memoryId of memoryIds) {
              try {
                const memRes = await api.memories[":id"].$get({ param: { id: memoryId } });
                if (memRes.ok) {
                  const memData = await memRes.json();
                  const name = await resolveMemoryTitleSafe(memData.cid, session.kWallet, memData.name || memoryId.slice(0, 12));
                  memories.push({ memoryId, name });
                } else {
                  memories.push({ memoryId, name: memoryId.slice(0, 12) });
                }
              } catch {
                memories.push({ memoryId, name: memoryId.slice(0, 12) });
              }
            }
            return { ...agent, connectedMemories: memories };
          } catch {
            return agent;
          }
        }),
      );
      const final = withLinks.map(r => r.status === "fulfilled" ? r.value : resolved[withLinks.indexOf(r)]);

      setAgents(final);
      if (final.length > 0 && !selectedAgentId) {
        setSelectedAgentId(final[0].id);
      }
    } catch (err: any) {
      console.error("Fetch agents error:", err);
      setError(err.message || "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, [session.isAuthenticated, session.kWallet, selectedAgentId]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // ─── Get & decrypt a single agent blueprint from IPFS ──────────────────────
  const getAgent = useCallback(
    async (id: string): Promise<Agent | null> => {
      const localMeta = agents.find(a => a.id === id);
      if (!localMeta) return null;

      // Already fully loaded
      if (localMeta.personality || !(localMeta as any).cid) return localMeta;

      // Dev mode: return defaults without decrypting
      if (!session.kWallet) {
        const fullAgent: Agent = {
          ...localMeta,
          icon: "🤖",
          personality: "",
          instructions: "",
          persistentMemory: true,
        };
        setAgents(prev => prev.map(a => (a.id === id ? fullAgent : a)));
        return fullAgent;
      }

      try {

        const base64Data = await retrieveFromIpfs((localMeta as any).cid);
        const jsonStr = new TextDecoder().decode(base64ToArrayBuffer(base64Data));
        const envelope = JSON.parse(jsonStr);

        const kData = await decryptWalletEnvelope(base64ToArrayBuffer(envelope.walletEnvelope), session.kWallet);

        const plaintext = await decryptData(base64ToArrayBuffer(envelope.ciphertext), kData);
        const blueprint: AgentBlueprint = JSON.parse(plaintext);

        const fullAgent: Agent = {
          ...localMeta,
          icon: blueprint.icon || "🤖",
          personality: blueprint.personality || "",
          instructions: blueprint.instructions || "",
          description: blueprint.description || localMeta.description || "",
          persistentMemory: blueprint.persistentMemory ?? true,
        };

        setAgents(prev => prev.map(a => (a.id === id ? fullAgent : a)));
        return fullAgent;
      } catch (err: any) {
        console.error("Retrieve and decrypt agent error:", err);
        throw err;
      }
    },
    [agents, session.kWallet],
  );

  // ─── Create agent (encrypt blueprint → IPFS → on-chain) ───────────────────
  const createAgent = useCallback(
    async (data: CreateAgent): Promise<Agent> => {
      setLoading(true);
      setError(null);

      try {
        let ipfsResult = { cid: `dev-${Date.now()}`, hash: generateDevHash() };

        const blueprint: AgentBlueprint = {
          name: data.name,
          personality: data.personality || "",
          instructions: (data as any).instructions || "",
          description: data.description || "",
          icon: data.icon || "🤖",
          persistentMemory: data.persistentMemory ?? true,
        };

        if (session.kWallet) {
          // Production: encrypt blueprint → IPFS → on-chain
          const kData = generateKData();
          const ciphertext = await encryptData(JSON.stringify(blueprint), kData);
          const walletEnvelope = await createWalletEnvelope(kData, session.kWallet);

          const ipfsPayload = {
            ciphertext: arrayBufferToBase64(ciphertext),
            walletEnvelope: arrayBufferToBase64(walletEnvelope),
            recoveryEnvelope: "",
          };

          const rawBytes = new TextEncoder().encode(JSON.stringify(ipfsPayload));
          const base64Payload = arrayBufferToBase64(rawBytes);
          ipfsResult = await pinToIpfs(base64Payload, data.name);
        }

        // 3. Register on-chain via Hono API
        const res = await api.agents.create.$post({
          json: {
            name: data.name,
            description: data.description || "",
            cid: ipfsResult.cid,
            hash: ipfsResult.hash,
          },
        });

        if (!res.ok) {
          const errBody = (await res.json()) as any;
          throw new Error(errBody.message || "Failed to register agent on-chain");
        }

        const newAgentData = (await res.json()) as any;
        const newAgent: Agent = {
          id: newAgentData.agentId,
          name: data.name,
          description: data.description || "",
          icon: blueprint.icon,
          personality: blueprint.personality,
          instructions: blueprint.instructions,
          connectedMemories: [],
          persistentMemory: blueprint.persistentMemory,
          isArchived: false,
          createdAt: new Date().toISOString().split("T")[0],
          updatedAt: new Date().toISOString().split("T")[0],
        };

        setAgents(prev => [newAgent, ...prev]);
        if (!selectedAgentId) setSelectedAgentId(newAgent.id);
        refreshBalance();
        return newAgent;
      } catch (err: any) {
        console.error("Create agent error:", err);
        setError(err.message || "Failed to create agent");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [session.kWallet, selectedAgentId, refreshBalance],
  );

  // ─── Update agent (re-encrypt blueprint → IPFS → on-chain) ────────────────
  const updateAgent = useCallback(
    async (id: string, data: UpdateAgent) => {
      setLoading(true);
      setError(null);

      try {
        const localAgent = agents.find(a => a.id === id);
        if (!localAgent) throw new Error("Agent not found locally");

        let ipfsResult = { cid: `dev-${Date.now()}`, hash: generateDevHash() };

        const blueprint: AgentBlueprint = {
          name: data.name ?? localAgent.name,
          personality: data.personality ?? localAgent.personality ?? "",
          instructions: (data as any).instructions ?? (localAgent as any).instructions ?? "",
          description: data.description ?? localAgent.description ?? "",
          icon: data.icon ?? localAgent.icon ?? "🤖",
          persistentMemory: data.persistentMemory ?? localAgent.persistentMemory ?? true,
        };

        if (session.kWallet) {
          const kData = generateKData();
          const ciphertext = await encryptData(JSON.stringify(blueprint), kData);
          const walletEnvelope = await createWalletEnvelope(kData, session.kWallet);

          const ipfsPayload = {
            ciphertext: arrayBufferToBase64(ciphertext),
            walletEnvelope: arrayBufferToBase64(walletEnvelope),
            recoveryEnvelope: "",
          };

          const rawBytes = new TextEncoder().encode(JSON.stringify(ipfsPayload));
          const base64Payload = arrayBufferToBase64(rawBytes);
          ipfsResult = await pinToIpfs(base64Payload, data.name || localAgent.name);
        }

        const res = await api.agents[":id"].$put({
          param: { id },
          json: {
            cid: ipfsResult.cid,
            hash: ipfsResult.hash,
          },
        });

        if (!res.ok) {
          const errBody = (await res.json()) as any;
          throw new Error(errBody.message || "Failed to update agent on-chain");
        }

        setAgents(prev =>
          prev.map(a =>
            a.id === id
              ? {
                  ...a,
                  name: data.name ?? a.name,
                  description: blueprint.description ?? a.description,
                  icon: blueprint.icon,
                  personality: blueprint.personality,
                  instructions: blueprint.instructions,
                  persistentMemory: blueprint.persistentMemory,
                  cid: ipfsResult.cid,
                  hash: ipfsResult.hash,
                  updatedAt: new Date().toISOString().split("T")[0],
                }
              : a,
          ),
        );
      } catch (err: any) {
        console.error("Update agent error:", err);
        setError(err.message || "Failed to update agent");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [agents, session.kWallet],
  );

  // ─── Delete (archive) agent ────────────────────────────────────────────────
  const deleteAgent = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await api.agents[":id"].archive.$post({ param: { id } });
      if (!res.ok) throw new Error("Failed to archive agent on-chain");
      setAgents(prev => prev.filter(a => a.id !== id));
      setConversations(prev => prev.filter(c => c.agentId !== id));
      setSelectedAgentId(prev => (prev === id ? null : prev));
    } catch (err: any) {
      console.error("Delete agent error:", err);
      setError(err.message || "Failed to delete agent");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Restore archived agent ──────────────────────────────────────────────
  const restoreAgent = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await api.agents[":id"].restore.$post({ param: { id } });
      if (!res.ok) throw new Error("Failed to restore agent on-chain");
      await fetchAgents();
    } catch (err: any) {
      console.error("Restore agent error:", err);
      setError(err.message || "Failed to restore agent");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchAgents]);

  // ─── Link / Unlink a memory to an agent ───────────────────────────────────
  const linkMemory = useCallback(async (agentId: string, memoryId: string) => {
    const res = await api.context.link.$post({
      json: { agentId, memoryId, priority: 100 },
    });
    // 409 = already linked, still update local state
    if (!res.ok && res.status !== 409) {
      const errBody = (await res.json()) as any;
      throw new Error(errBody.message || "Failed to link memory");
    }
    let name = memoryId.slice(0, 12);
    try {
      const memRes = await api.memories[":id"].$get({ param: { id: memoryId } });
      if (memRes.ok) {
        const memData = await memRes.json();
        name = await resolveMemoryTitleSafe(memData.cid, session.kWallet, memData.name || name);
      }
    } catch {}
    setAgents(prev =>
      prev.map(a =>
        a.id === agentId
          ? {
              ...a,
              connectedMemories: [
                ...a.connectedMemories.filter(m => m.memoryId !== memoryId),
                { memoryId, name },
              ],
            }
          : a,
      ),
    );
  }, [session.kWallet]);

  const unlinkMemory = useCallback(async (agentId: string, memoryId: string) => {
    const res = await api.context.unlink.$delete({
      json: { agentId, memoryId },
    });
    if (!res.ok) {
      const errBody = (await res.json()) as any;
      throw new Error(errBody.message || "Failed to unlink memory");
    }
    setAgents(prev =>
      prev.map(a =>
        a.id === agentId ? { ...a, connectedMemories: a.connectedMemories.filter(m => m.memoryId !== memoryId) } : a,
      ),
    );
  }, []);

  // ─── Fetch linked memories for an agent ───────────────────────────────────
  const fetchLinkedMemories = useCallback(async (agentId: string): Promise<string[]> => {
    const res = await api.context.agent[":agentId"].memories.$get({
      param: { agentId },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    return (data.links || []).map((l: any) => l.memoryId as string);
  }, []);

  // ─── Conversations (local, no on-chain yet) ────────────────────────────────
  const getConversations = useCallback(
    (agentId: string) => conversations.filter(c => c.agentId === agentId),
    [conversations],
  );

  const createConversation = useCallback((agentId: string) => {
    const newConv: Conversation = {
      id: crypto.randomUUID(),
      agentId,
      title: "Nueva conversación",
      timestamp: new Date().toISOString(),
    };
    setConversations(prev => [newConv, ...prev]);
    setSelectedConversationId(newConv.id);
    setMessages(prev => ({ ...prev, [newConv.id]: [] }));
    return newConv;
  }, []);

  // ─── Local message handling (Phase 5 will replace with real streaming) ─────
  const sendMessage = useCallback((conversationId: string, content: string) => {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: AgentChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: now,
    };
    setMessages(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), userMsg],
    }));

    setTimeout(() => {
      const assistantMsg: AgentChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `He recibido tu mensaje. La integración de streaming con IA se habilitará en la Fase 5. (Fase 4 completada ✓)`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), assistantMsg],
      }));
      setConversations(prev =>
        prev.map(c => (c.id === conversationId ? { ...c, lastMessage: content, timestamp: now } : c)),
      );
    }, 800);
  }, []);

  return {
    agents,
    selectedAgent,
    selectedAgentId,
    setSelectedAgentId,
    selectedConversationId,
    setSelectedConversationId,
    agentConversations,
    currentMessages,
    loading,
    error,
    getAgent,
    createAgent,
    updateAgent,
    deleteAgent,
    restoreAgent,
    fetchAgents,
    getConversations,
    createConversation,
    sendMessage,
    linkMemory,
    unlinkMemory,
    fetchLinkedMemories,
  };
}
