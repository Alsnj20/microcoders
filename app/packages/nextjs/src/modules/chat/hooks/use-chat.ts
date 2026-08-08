"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "~~/services/api/client";
import {
  saveConversation,
  loadConversation,
  listConversations,
  deleteConversationLocal,
} from "~~/services/api/chat-storage";
import type { AgentBlueprint, ChatConversation, ChatMessage, UserProtocolState } from "../types/chat";

const ASSISTANT_AVATAR = "https://lh3.googleusercontent.com/aida-public/AB6AXuBUmXEidBO3zpY2rMxk3Oa3i1XCq9JMTtX2Y9Sdn73ycyngQdB2pmkTY3ahd-shRj26UBLDhdxlwfYjkteWRxaQCRUKifpT6JjM-TY_3heKXwGniuOyNrEOImrIPRuSmoY2d1pfaHODuGeGwNtyC3KLGCVhKxpt2tc_xE8QCJgxmyb66xqmZMI78lW4qAVuwwRaUB7X___-CJWsYXH8NzEmiuCsHog1vg35BEOKqDtpQGv5Ve-qfI3I";
const USER_AVATAR = "https://lh3.googleusercontent.com/aida-public/AB6AXuCW8LUo9gm27dPmMFaHiMdj3UbYIv49SlmZ4WMcAnEsydpgz2LatC5HD8l3AGrVqpcq4qzI9RrxsSQgFSuWfYKZuNS6AOoRYrcuPizgq76APhWr_caPMr9Wvu2r0vEQxTrNCnVdIOhkoXauiZQP9WtG8s0X4acUrSGrwL_RS-pdrDOOEnB1R2WeILBHevRL2PgLUJRMyk3PCznh4zJquJr5-FDs_Tx5mTj0k6V8g8sEjrGyn_7sNsFH";

function generateAgentResponse(agentName: string, userMessage: string): string {
  return `[${agentName}] Procesando consulta: "${userMessage}". Consultando memorias cifradas en MemoryChain...`;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agents, setAgents] = useState<AgentBlueprint[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [userState, setUserState] = useState<UserProtocolState>({
    username: "",
    memoryCredits: 0,
    activeAgentId: "",
  });

  useEffect(() => {
    loadAgents();
    setConversations(listConversations());
  }, []);

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

  const selectConversation = useCallback(
    async (id: string) => {
      setSelectedConversationId(id);
      const conv = await loadConversation(id);
      setMessages(conv?.messages || []);
    },
    [],
  );

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

      const agent = agents.find((a) => a.id === userState.activeAgentId);
      const agentName = agent?.name || "Agent";

      const botMsg: ChatMessage = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        avatarUrl: ASSISTANT_AVATAR,
        content: generateAgentResponse(agentName, text),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        systemLog: `> SYSTEM LOG: QUERY_DISPATCHED. CONSUMED 2 MC. SHA-256 HASH VERIFIED.`,
        creditsUsed: 2,
      };

      setMessages((prev) => {
        const updated = [...prev, botMsg];

        const allMessages = updated;
        saveConversation({
          id: convId,
          title: (isNew ? text.slice(0, 40) : conversations.find((c) => c.id === convId)?.title) || "Chat",
          messages: allMessages,
          createdAt: new Date().toISOString(),
        }).catch((err) => console.error("Failed to save conversation:", err));

        return updated;
      });

      setUserState((prev) => ({
        ...prev,
        memoryCredits: Math.max(0, prev.memoryCredits - 2),
      }));
    },
    [selectedConversationId, agents, userState.activeAgentId, conversations],
  );

  const deleteConversation = useCallback(
    (id: string) => {
      deleteConversationLocal(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (selectedConversationId === id) {
        setSelectedConversationId(null);
        setMessages([]);
      }
    },
    [selectedConversationId],
  );

  return {
    messages,
    agents,
    conversations,
    selectedConversationId,
    onSelectConversation: selectConversation,
    onCreateConversation: createConversation,
    onDeleteConversation: deleteConversation,
    userState,
    sendMessage,
  };
}
