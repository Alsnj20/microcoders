"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "~~/services/api/client";
import { useGlobalState } from "~~/services/store/store";
import {
  saveConversation,
  loadConversation,
  listConversations,
  deleteConversationLocal,
} from "~~/services/api/chat-storage";
import type { AgentBlueprint, ChatConversation, ChatMessage, UserProtocolState } from "../types/chat";

const ASSISTANT_AVATAR = "https://lh3.googleusercontent.com/aida-public/AB6AXuBUmXEidBO3zpY2rMxk3Oa3i1XCq9JMTtX2Y9Sdn73ycyngQdB2pmkTY3ahd-shRj26UBLDhdxlwfYjkteWRxaQCRUKifpT6JjM-TY_3heKXwGniuOyNrEOImrIPRuSmoY2d1pfaHODuGeGwNtyC3KLGCVhKxpt2tc_xE8QCJgxmyb66xqmZMI78lW4qAVuwwRaUB7X___-CJWsYXH8NzEmiuCsHog1vg35BEOKqDtpQGv5Ve-qfI3I";
const USER_AVATAR = "https://lh3.googleusercontent.com/aida-public/AB6AXuCW8LUo9gm27dPmMFaHiMdj3UbYIv49SlmZ4WMcAnEsydpgz2LatC5HD8l3AGrVqpcq4qzI9RrxsSQgFSuWfYKZuNS6AOoRYrcuPizgq76APhWr_caPMr9Wvu2r0vEQxTrNCnVdIOhkoXauiZQP9WtG8s0X4acUrSGrwL_RS-pdrDOOEnB1R2WeILBHevRL2PgLUJRMyk3PCznh4zJquJr5-FDs_Tx5mTj0k6V8g8sEjrGyn_7sNsFH";

interface LinkedMemory {
  memoryId: string;
  title: string;
  cid: string;
}

export function useChat() {
  const { session, setCreditBalance } = useGlobalState();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agents, setAgents] = useState<AgentBlueprint[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [linkedMemories, setLinkedMemories] = useState<LinkedMemory[]>([]);
  const [userState, setUserState] = useState<UserProtocolState>({
    username: session.username || "",
    memoryCredits: 0,
    activeAgentId: "",
  });
  const welcomeLoaded = useRef(false);

  useEffect(() => {
    loadAgents();
    setConversations(listConversations());
  }, []);

  // Load welcome message on first visit
  useEffect(() => {
    if (session.isAuthenticated && !welcomeLoaded.current && messages.length === 0) {
      welcomeLoaded.current = true;
      const loadWelcome = async () => {
        try {
          const username = localStorage.getItem("mc_username") || "";
          const addr = session.address || "";
          const url = `${api.chat.welcome.$url()}?username=${encodeURIComponent(username || "usuario")}`;
          const res = await fetch(url, {
            headers: { "X-Dev-Wallet": addr },
          });
          if (res.ok) {
            const data = await res.json();
            const welcomeMsg: ChatMessage = {
              id: "welcome",
              role: "assistant",
              avatarUrl: ASSISTANT_AVATAR,
              content: data.message,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };
            setMessages([welcomeMsg]);
          }
        } catch {}
      };
      loadWelcome();
    }
  }, [session.isAuthenticated, session.address]);

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

  const loadLinkedMemories = useCallback(async (agentId: string) => {
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
            memories.push({ memoryId: link.memoryId, title: memData.name || link.memoryId, cid: memData.cid });
          }
        }
        setLinkedMemories(memories);
      }
    } catch (err) {
      console.error("Failed to load linked memories:", err);
    }
  }, []);

  const selectAgent = useCallback((agentId: string) => {
    setUserState((prev) => ({ ...prev, activeAgentId: agentId }));
    loadLinkedMemories(agentId);
  }, [loadLinkedMemories]);

  const linkMemory = useCallback(
    async (memoryId: string) => {
      if (!userState.activeAgentId) return;
      try {
        const res = await api.context.link.$post({
          json: { agentId: userState.activeAgentId, memoryId, priority: 0 },
        });
        // Fetch memory info regardless of link result (already linked = still show it)
        const memRes = await api.memories[":id"].$get({ param: { id: memoryId } });
        if (memRes.ok) {
          const memData = await memRes.json();
          // Only add if not already in the list
          setLinkedMemories((prev) => {
            if (prev.some((m) => m.memoryId === memoryId)) return prev;
            return [...prev, { memoryId, title: memData.name || memoryId, cid: memData.cid }];
          });
        }
      } catch (err) {
        console.error("Failed to link memory:", err);
      }
    },
    [userState.activeAgentId],
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

  const selectConversation = useCallback(async (id: string) => {
    setSelectedConversationId(id);
    const conv = await loadConversation(id);
    setMessages(conv?.messages || []);
  }, []);

  const createConversation = () => {
    const id = Date.now().toString();
    const conv: ChatConversation = {
      id,
      title: "Nueva conversación",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setConversations((prev) => [conv, ...prev]);
    setSelectedConversationId(id);
    setMessages([]);
    welcomeLoaded.current = false;
  };

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const convId = selectedConversationId || Date.now().toString();
      const isNew = !selectedConversationId;

      if (isNew) {
        const conv: ChatConversation = {
          id: convId,
          title: text.slice(0, 40) + (text.length > 40 ? "..." : ""),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setConversations((prev) => [conv, ...prev]);
        setSelectedConversationId(convId);
      }

      const userMsg: ChatMessage = {
        id: `${Date.now()}-user`,
        role: "user",
        avatarUrl: USER_AVATAR,
        content: text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, userMsg]);

      // Send to AI
      try {
        const res = await api.chat.send.$post({
          json: {
            message: text,
            agentId: userState.activeAgentId || undefined,
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
            systemLog: `> MODEL: ${data.model}`,
            creditsUsed: 2,
          };
          const newMessages = [...messages, userMsg, botMsg];
          setMessages(newMessages);

          saveConversation({
            id: convId,
            title: (isNew ? text.slice(0, 40) : conversations.find((c) => c.id === convId)?.title) || "Chat",
            messages: newMessages,
            createdAt: new Date().toISOString(),
          }).catch(() => {});
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
    [selectedConversationId, agents, userState.activeAgentId, conversations, refreshBalance],
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
            hash: "0x" + "00".repeat(32),
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

  const deleteConversation = useCallback(
    (id: string) => {
      deleteConversationLocal(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (selectedConversationId === id) {
        setSelectedConversationId(null);
        setMessages([]);
        welcomeLoaded.current = false;
      }
    },
    [selectedConversationId],
  );

  return {
    messages,
    agents,
    conversations,
    selectedConversationId,
    linkedMemories,
    onSelectConversation: selectConversation,
    onCreateConversation: createConversation,
    onDeleteConversation: deleteConversation,
    onSelectAgent: selectAgent,
    onLinkMemory: linkMemory,
    onUnlinkMemory: unlinkMemory,
    onSaveAsMemory: saveAsMemory,
    userState,
    sendMessage,
  };
}
