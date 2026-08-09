"use client";

import { useCallback, useEffect, useState } from "react";
import { useGlobalState } from "~~/services/store/store";
import { api } from "~~/services/api/client";
import { pinToIpfs, retrieveFromIpfs } from "~~/services/api/ipfs";
import { encryptData, decryptData, createWalletEnvelope, decryptWalletEnvelope } from "~~/services/crypto/envelope";
import { generateKData } from "~~/services/crypto/keys";
import { arrayBufferToBase64, base64ToArrayBuffer } from "~~/services/crypto/utils";
import type { Agent, AgentChatMessage, Conversation, CreateAgent, UpdateAgent } from "../types/agent";

// Agent blueprint = all rich metadata stored encrypted on IPFS
// On-chain only stores: name, description (plain), cid, hash
interface AgentBlueprint {
  name: string;
  description: string;
  personality: string;
  model: string;
  icon: string;
  tools: string[];
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
  const [isGenerating, setIsGenerating] = useState(false);

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
        .filter((a: any) => a.status === 0)
        .map((a: any) => ({
          id: a.agentId,
          name: a.name,
          description: a.description || "",
          icon: "🤖",
          model: "gpt-4o-mini" as any,
          personality: "",
          tools: [],
          connectedMemories: [],
          persistentMemory: true,
          cid: a.cid,
          hash: a.hash,
          createdAt: new Date(a.createdAt * 1000).toISOString().split("T")[0],
          updatedAt: new Date(a.createdAt * 1000).toISOString().split("T")[0],
        }));

      setAgents(mapped);
      if (mapped.length > 0 && !selectedAgentId) {
        setSelectedAgentId(mapped[0].id);
      }
    } catch (err: any) {
      console.error("Fetch agents error:", err);
      setError(err.message || "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, [session.isAuthenticated, selectedAgentId]);

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
          model: "gpt-4o-mini" as any,
          personality: "",
          tools: [],
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
          name: blueprint.name || localMeta.name,
          description: blueprint.description || localMeta.description,
          icon: blueprint.icon || "🤖",
          model: blueprint.model as any,
          personality: blueprint.personality || "",
          tools: blueprint.tools || [],
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
          description: data.description || "",
          personality: data.personality || "",
          model: data.model || "gpt-4o-mini",
          icon: data.icon || "🤖",
          tools: data.tools || [],
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
          model: blueprint.model as any,
          personality: blueprint.personality,
          tools: blueprint.tools,
          connectedMemories: [],
          persistentMemory: blueprint.persistentMemory,
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
          description: data.description ?? localAgent.description ?? "",
          personality: data.personality ?? localAgent.personality ?? "",
          model: data.model ?? localAgent.model ?? "gpt-4o-mini",
          icon: data.icon ?? localAgent.icon ?? "🤖",
          tools: data.tools ?? localAgent.tools ?? [],
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
                  description: data.description ?? a.description,
                  icon: blueprint.icon,
                  model: blueprint.model as any,
                  personality: blueprint.personality,
                  tools: blueprint.tools,
                  persistentMemory: blueprint.persistentMemory,
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
    setAgents(prev =>
      prev.map(a =>
        a.id === agentId ? { ...a, connectedMemories: [...new Set([...a.connectedMemories, memoryId])] } : a,
      ),
    );
  }, []);

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
        a.id === agentId ? { ...a, connectedMemories: a.connectedMemories.filter(m => m !== memoryId) } : a,
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
    if (!content.trim() || isGenerating) return;

    setIsGenerating(true);

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
      setIsGenerating(false);
    }, 800);
  }, [isGenerating]);

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
    getConversations,
    createConversation,
    sendMessage,
    linkMemory,
    unlinkMemory,
    fetchLinkedMemories,
    isGenerating,
  };
}
