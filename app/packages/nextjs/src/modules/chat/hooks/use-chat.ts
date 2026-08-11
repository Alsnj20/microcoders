"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { keccak256, toHex } from "viem";
import { api } from "~~/services/api/client";
import { useGlobalState } from "~~/services/store/store";
import { retrieveFromIpfs } from "~~/services/api/ipfs";
import { decryptData, decryptWalletEnvelope } from "~~/services/crypto/envelope";
import { base64ToArrayBuffer } from "~~/services/crypto/utils";
import {
  saveConversation,
  listConversations,
  deleteConversation,
  createConversation,
  loadConversationMessages,
} from "~~/services/api/chat-storage";
import type { AgentBlueprint, ChatConversation, ChatMessage, UserProtocolState } from "../types/chat";

const ASSISTANT_AVATAR = "https://lh3.googleusercontent.com/aida-public/AB6AXuBUmXEidBO3zpY2rMxk3Oa3i1XCq9JMTtX2Y9Sdn73ycyngQdB2pmkTY3ahd-shRj26UBLDhdxlwfYjkteWRxaQCRUKifpT6JjM-TY_3heKXwGniuOyNrEOImrIPRuSmoY2d1pfaHODuGeGwNtyC3KLGCVhKxpt2tc_xE8QCJgxmyb66xqmZMI78lW4qAVuwwRaUB7X___-CJWsYXH8NzEmiuCsHog1vg35BEOKqDtpQGv5Ve-qfI3I";
const USER_AVATAR = "https://lh3.googleusercontent.com/aida-public/AB6AXuCW8LUo9gm27dPmMFaHiMdj3UbYIv49SlmZ4WMcAnEsydpgz2LatC5HD8l3AGrVqpcq4qzI9RrxsSQgFSuWfYKZuNS6AOoRYrcuPizgq76APhWr_caPMr9Wvu2r0vEQxTrNCnVdIOhkoXauiZQP9WtG8s0X4acUrSGrwL_RS-pdrDOOEnB1R2WeILBHevRL2PgLUJRMyk3PCznh4zJquJr5-FDs_Tx5mTj0k6V8g8sEjrGyn_7sNsFH";

function hashMemory(content: string): string {
  return keccak256(toHex(content));
}

interface LinkedMemory {
  memoryId: string;
  title: string;
  cid: string;
  content?: string;
}

interface AgentBlueprintContent {
  name?: string;
  personality?: string;
  instructions?: string;
  description?: string;
  icon?: string;
  persistentMemory?: boolean;
}

// The agent blueprint is a JSON envelope stored encrypted on IPFS. It holds the
// agent persona (personality/instructions). Only the frontend can decrypt it.
async function fetchDecryptedAgentBlueprint(cid: string, kWallet: Uint8Array): Promise<AgentBlueprintContent> {
  const base64Data = await retrieveFromIpfs(cid);
  const jsonStr = new TextDecoder().decode(base64ToArrayBuffer(base64Data));
  const envelope = JSON.parse(jsonStr);
  const kData = await decryptWalletEnvelope(base64ToArrayBuffer(envelope.walletEnvelope), kWallet);
  const plaintext = await decryptData(base64ToArrayBuffer(envelope.ciphertext), kData);
  return JSON.parse(plaintext) as AgentBlueprintContent;
}

// Memory blueprints hold the raw memory content as plaintext ciphertext.
async function fetchDecryptedMemoryContent(cid: string, kWallet: Uint8Array): Promise<string> {
  const base64Data = await retrieveFromIpfs(cid);
  const jsonStr = new TextDecoder().decode(base64ToArrayBuffer(base64Data));
  const envelope = JSON.parse(jsonStr);
  const kData = await decryptWalletEnvelope(base64ToArrayBuffer(envelope.walletEnvelope), kWallet);
  return decryptData(base64ToArrayBuffer(envelope.ciphertext), kData);
}

const NEUTRAL_SYSTEM_PROMPT = "Eres un asistente útil. Responde en español.";
const MEMORYCHAIN_BRANDING =
  "Eres un agente de IA de MemoryChain, una plataforma de conocimiento descentralizado donde los usuarios guardan y gestionan su información personal.";

function buildSystemPrompt(agent: AgentBlueprintContent | null): string {
  if (!agent) return NEUTRAL_SYSTEM_PROMPT;
  const personality = agent.personality?.trim();
  const instructions = agent.instructions?.trim();
  if (!personality && !instructions) return NEUTRAL_SYSTEM_PROMPT;
  const name = agent.name?.trim() || "Agente";
  const persona = [`Eres ${name}.`, personality, instructions].filter(Boolean).join("\n");
  return `${MEMORYCHAIN_BRANDING}\n\n${persona}`;
}

export function useChat() {
  const { session, setCreditBalance } = useGlobalState();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agents, setAgents] = useState<AgentBlueprint[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [linkedMemories, setLinkedMemories] = useState<LinkedMemory[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o-mini");
  const [userState, setUserState] = useState<UserProtocolState>({
    username: session.username || "",
    memoryCredits: 0,
    activeAgentId: "",
  });
  const welcomeLoaded = useRef(false);

  useEffect(() => {
    loadAgents();
    loadConversations();
  }, []);

  const fetchWelcomeMessage = useCallback(async (): Promise<ChatMessage | null> => {
    try {
      const username = localStorage.getItem("mc_username") || session.username || "";
      const addr = session.address || "";
      const url = `${api.chat.welcome.$url()}?username=${encodeURIComponent(username || "usuario")}`;
      const res = await fetch(url, {
        headers: { "X-Dev-Wallet": addr },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        return {
          id: "welcome",
          role: "assistant",
          avatarUrl: ASSISTANT_AVATAR,
          content: data.message,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
      }
    } catch {}
    return null;
  }, [session.address, session.username]);

  // Load welcome message on first visit
  useEffect(() => {
    if (session.isAuthenticated && !welcomeLoaded.current && messages.length === 0) {
      welcomeLoaded.current = true;
      fetchWelcomeMessage().then((msg) => {
        if (msg) setMessages([msg]);
      });
    }
  }, [session.isAuthenticated, fetchWelcomeMessage, messages.length]);

  const refreshBalance = useCallback(async () => {
    try {
      const res = await api.credits.balance.$get();
      if (res.ok) {
        const data = await res.json();
        setCreditBalance(data.balance ?? 0);
      }
    } catch {}
  }, [setCreditBalance]);

  const loadAgents = async () => {
    try {
      const res = await api.agents.$get();
      if (res.ok) {
        const data = await res.json();
        const mapped: AgentBlueprint[] = data.agents.map((a: any) => ({
          id: a.agentId,
          name: a.name || "Agent",
          description: a.description || "",
          icon: "smart_toy",
          version: `v${a.version}`,
          blueprintCid: a.cid,
          active: a.status === 0,
        }));
        setAgents(mapped);
        if (mapped.length > 0 && !userState.activeAgentId) {
          setUserState((prev) => ({ ...prev, activeAgentId: mapped[0].id }));
        }
      }
    } catch {
      setAgents([]);
    }
  };

  const loadConversations = async () => {
    try {
      const convs = await listConversations();
      setConversations(convs);
    } catch {
      setConversations([]);
    }
  };

  const loadLinkedMemories = useCallback(
    async (agentId: string) => {
      try {
        const res = await api.context.agent[agentId].memories.$get();
        if (res.ok) {
          const data = await res.json();
          const links = data.links || [];
          const memories: LinkedMemory[] = [];
          for (const link of links) {
            const memRes = await api.memories[":id"].$get({ param: { id: link.memoryId } });
            if (memRes.ok) {
              const memData = await memRes.json();
              let content = "";
              if (session.kWallet && memData.cid && !memData.cid.startsWith("dev-")) {
                try {
                  content = await fetchDecryptedMemoryContent(memData.cid, session.kWallet);
                } catch (err) {
                  console.error("Failed to decrypt linked memory:", err);
                }
              }
              memories.push({
                memoryId: link.memoryId,
                title: memData.name || link.memoryId,
                cid: memData.cid,
                content,
              });
            }
          }
          setLinkedMemories(memories);
        }
      } catch (err) {
        console.error("Failed to load linked memories:", err);
      }
    },
    [session.kWallet],
  );

  useEffect(() => {
    if (userState.activeAgentId) {
      loadLinkedMemories(userState.activeAgentId);
    }
  }, [userState.activeAgentId, loadLinkedMemories]);

  const selectAgent = useCallback((agentId: string) => {
    setUserState((prev) => ({ ...prev, activeAgentId: agentId }));
  }, []);

  const linkMemory = useCallback(
    async (memoryId: string) => {
      if (!userState.activeAgentId) return;
      try {
        const res = await api.context.link.$post({
          json: { agentId: userState.activeAgentId, memoryId, priority: 0 },
        });
        if (res.ok || res.status === 409) {
          const memRes = await api.memories[":id"].$get({ param: { id: memoryId } });
          if (memRes.ok) {
            const memData = await memRes.json();
            let content = "";
            if (session.kWallet && memData.cid && !memData.cid.startsWith("dev-")) {
              try {
                content = await fetchDecryptedMemoryContent(memData.cid, session.kWallet);
              } catch (err) {
                console.error("Failed to decrypt linked memory:", err);
              }
            }
            setLinkedMemories((prev) => {
              if (prev.some((m) => m.memoryId === memoryId)) return prev;
              return [...prev, { memoryId, title: memData.name || memoryId, cid: memData.cid, content }];
            });
          }
        }
      } catch (err) {
        console.error("Failed to link memory:", err);
      }
    },
    [userState.activeAgentId, session.kWallet],
  );

  const unlinkMemory = useCallback(
    async (memoryId: string) => {
      if (!userState.activeAgentId) return;
      try {
        await api.context.unlink.$delete({
          json: { agentId: userState.activeAgentId, memoryId },
        });
        setLinkedMemories((prev) => prev.filter((m) => m.memoryId !== memoryId));
      } catch (err) {
        console.error("Failed to unlink memory:", err);
      }
    },
    [userState.activeAgentId],
  );

  const selectConversation = useCallback(
    async (id: string) => {
      setSelectedConversationId(id);
      const conv = conversations.find((c) => c.id === id);
      if (!conv?.onChainId || !conv.cid) {
        const welcomeMsg = await fetchWelcomeMessage();
        setMessages(welcomeMsg ? [welcomeMsg] : []);
        return;
      }
      const msgs = await loadConversationMessages(conv.onChainId, conv.cid, session.kWallet);
      setMessages(msgs);
    },
    [conversations, session.kWallet, fetchWelcomeMessage],
  );

  const createNewConversation = useCallback(async () => {
    const conv: ChatConversation = {
      id: Date.now().toString(),
      title: "Nueva conversación",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setConversations((prev) => [conv, ...prev]);
    setSelectedConversationId(conv.id);
    welcomeLoaded.current = true;
    const welcomeMsg = await fetchWelcomeMessage();
    setMessages(welcomeMsg ? [welcomeMsg] : []);
  }, [fetchWelcomeMessage]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const convId = selectedConversationId || Date.now().toString();
      let onChainId = conversations.find((c) => c.id === convId)?.onChainId;

      if (!onChainId) {
        // Create conversation on-chain (first message of a new/unsaved chat)
        const chatId = await createConversation(text.slice(0, 40) + (text.length > 40 ? "..." : ""));
        onChainId = chatId || undefined;

        setConversations((prev) => {
          const existing = prev.find((c) => c.id === convId);
          if (existing) {
            return prev.map((c) => (c.id === convId ? { ...c, onChainId } : c));
          }
          return [
            {
              id: convId,
              onChainId,
              title: text.slice(0, 40) + (text.length > 40 ? "..." : ""),
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
            ...prev,
          ];
        });
        setSelectedConversationId(convId);
      }

      const userMsg: ChatMessage = {
        id: `${Date.now()}-user`,
        role: "user",
        avatarUrl: USER_AVATAR,
        content: text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        agentId: userState.activeAgentId,
      };

      setMessages((prev) => [...prev, userMsg]);

      // Resolve the selected agent's persona from its decrypted blueprint.
      let systemPrompt: string | undefined;
      if (userState.activeAgentId) {
        const agent = agents.find((a) => a.id === userState.activeAgentId);
        if (agent?.blueprintCid && !agent.blueprintCid.startsWith("dev-") && session.kWallet) {
          try {
            const blueprint = await fetchDecryptedAgentBlueprint(agent.blueprintCid, session.kWallet);
            systemPrompt = buildSystemPrompt(blueprint);
          } catch (err) {
            console.error("Failed to decrypt agent persona:", err);
          }
        }
        if (!systemPrompt) {
          systemPrompt = buildSystemPrompt(
            agent ? { name: agent.name, personality: "", instructions: "" } : null,
          );
        }
      }

      // Send to AI
      try {
        const res = await api.chat.send.$post({
          json: {
            message: text,
            agentId: userState.activeAgentId || undefined,
            chatId: onChainId || undefined,
            model: selectedModel,
            systemPrompt: systemPrompt || undefined,
            memories: linkedMemories.filter((m) => m.content).map((m) => ({ title: m.title, content: m.content })),
            history: messages
              .filter((m) => m.id !== "welcome" && (m.role === "user" || m.role === "assistant"))
              .map((m) => ({ role: m.role, content: m.content })),
          },
        });

        if (res.ok) {
          const data = await res.json();
          const botMsg: ChatMessage = {
            id: `${Date.now()}-assistant`,
            role: "assistant",
            avatarUrl: ASSISTANT_AVATAR,
            content: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            agentId: userState.activeAgentId,
            systemLog: `> MODEL: ${data.model}`,
            creditsUsed: data.creditsUsed || 2,
          };
          const newMessages = [...messages, userMsg, botMsg];
          setMessages(newMessages);

          // Save to on-chain chat
          if (onChainId) {
            saveConversation({
              id: convId,
              onChainId,
              title: conversations.find((c) => c.id === convId)?.title || text.slice(0, 40),
              messages: newMessages,
              createdAt: new Date().toISOString(),
            }, session.kWallet)
              .then((cid) => {
                if (cid) {
                  setConversations((prev) =>
                    prev.map((c) => (c.id === convId ? { ...c, onChainId, cid } : c)),
                  );
                }
              })
              .catch((err) => console.error("Failed to persist chat:", err));
          }
        } else {
          const errData = await res.json();
          const errorMsg: ChatMessage = {
            id: `${Date.now()}-error`,
            role: "assistant",
            avatarUrl: ASSISTANT_AVATAR,
            content: `Error: ${errData.message || "No se pudo procesar tu mensaje"}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
      } catch (err: any) {
        const errorMsg: ChatMessage = {
          id: `${Date.now()}-error`,
          role: "assistant",
          avatarUrl: ASSISTANT_AVATAR,
          content: `Error de conexión: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }

      setUserState((prev) => ({
        ...prev,
        memoryCredits: Math.max(0, prev.memoryCredits - 2),
      }));

      refreshBalance();
    },
    [selectedConversationId, agents, userState.activeAgentId, conversations, refreshBalance, messages, selectedModel, linkedMemories, session.kWallet],
  );

  const saveAsMemory = useCallback(
    async (messageId: string) => {
      const msg = messages.find((m) => m.id === messageId);
      if (!msg) return;

      try {
        const res = await api.memories.create.$post({
          json: {
            name: msg.content.slice(0, 60) + (msg.content.length > 60 ? "..." : ""),
            cid: `chat-export-${Date.now()}`,
            hash: hashMemory(msg.content),
            memoryType: 0,
            visibility: 0,
          },
        });
        if (res.ok) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId ? { ...m, memoryCid: "Guardada como memoria" } : m,
            ),
          );
        }
      } catch (err) {
        console.error("Failed to save as memory:", err);
      }
    },
    [messages],
  );

  const deleteConversationHandler = useCallback(
    async (id: string) => {
      const conv = conversations.find((c) => c.id === id);
      if (conv?.onChainId) {
        await deleteConversation(conv.onChainId);
      }
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (selectedConversationId === id) {
        setSelectedConversationId(null);
        setMessages([]);
        welcomeLoaded.current = false;
      }
    },
    [selectedConversationId, conversations],
  );

  return {
    messages,
    agents,
    conversations,
    selectedConversationId,
    linkedMemories,
    selectedModel,
    setSelectedModel,
    onSelectConversation: selectConversation,
    onCreateConversation: createNewConversation,
    onDeleteConversation: deleteConversationHandler,
    onSelectAgent: selectAgent,
    onLinkMemory: linkMemory,
    onUnlinkMemory: unlinkMemory,
    onSaveAsMemory: saveAsMemory,
    userState,
    sendMessage,
  };
}
