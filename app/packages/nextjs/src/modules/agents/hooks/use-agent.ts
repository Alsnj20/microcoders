"use client";

import { useCallback, useState } from "react";
import type { Agent, AgentChatMessage, Conversation, CreateAgent, UpdateAgent } from "../types/agent";

const INITIAL_AGENTS: Agent[] = [
  {
    id: "agent-1",
    name: "Research Agent",
    description: "Agente de investigación para recuperar y analizar información de documentos.",
    icon: "🧠",
    model: "gpt-5.5",
    personality: "Eres un agente de investigación experto. Ayudas a los usuarios a encontrar información relevante en sus memorias y documentos.",
    tools: ["SearchTool", "PDFLoader", "VectorStore"],
    connectedMemories: ["mem-1", "mem-2"],
    persistentMemory: true,
    createdAt: "2024-05-10",
    updatedAt: "2024-05-10",
  },
  {
    id: "agent-2",
    name: "Trading Assistant",
    description: "Analista de DeFi & Yields para optimizar inversiones.",
    icon: "📈",
    model: "claude",
    personality: "Eres un asistente de trading especializado en DeFi. Ayudas a analizar yields, pools de liquidez y oportunidades de inversión.",
    tools: ["SearchTool", "BlockchainReader"],
    connectedMemories: ["mem-3"],
    persistentMemory: true,
    createdAt: "2024-05-08",
    updatedAt: "2024-05-09",
  },
  {
    id: "agent-3",
    name: "Code Reviewer",
    description: "Revisa y mejora código con mejores prácticas.",
    icon: "💻",
    model: "gemini",
    personality: "Eres un revisor de código experto. Analizas código, encuentras bugs, sugieres mejoras y aseguras que se sigan las mejores prácticas.",
    tools: ["SearchTool", "CodeAnalyzer"],
    connectedMemories: [],
    persistentMemory: false,
    createdAt: "2024-05-05",
    updatedAt: "2024-05-05",
  },
];

const INITIAL_CONVERSATIONS: Conversation[] = [
  { id: "conv-1", agentId: "agent-1", title: "Investigación de LangChain", lastMessage: "He encontrado 3 documentos relevantes...", timestamp: "10:24 AM" },
  { id: "conv-2", agentId: "agent-1", title: "Resumen de Paper: RAG", lastMessage: "El paper describe una arquitectura...", timestamp: "Ayer" },
  { id: "conv-3", agentId: "agent-2", title: "Ideas para mi agente", lastMessage: "Aquí tienes algunas ideas...", timestamp: "2 días atrás" },
  { id: "conv-4", agentId: "agent-1", title: "Arquitectura de memoria", lastMessage: "La arquitectura propuesta es...", timestamp: "3 días atrás" },
];

const INITIAL_MESSAGES: Record<string, AgentChatMessage[]> = {
  "conv-1": [
    { id: "msg-1", role: "assistant", content: "¡Hola! Soy tu agente de investigación. ¿En qué puedo ayudarte hoy?", timestamp: "10:20 AM" },
    { id: "msg-2", role: "user", content: "¿Qué sabes sobre LangChain?", timestamp: "10:22 AM" },
    { id: "msg-3", role: "assistant", content: "LangChain es un framework para desarrollar aplicaciones potenciadas por LLMs. Permite:\n\n• **Chains**: Composición de llamadas a LLMs\n• **Agents**: Uso de herramientas de forma autónoma\n• **Memory**: Gestión de contexto conversacional\n• **Retrieval**: RAG para documentos\n\n¿Te gustaría que profundice en algún aspecto específico?", timestamp: "10:24 AM" },
  ],
};

export function useAgent() {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [messages, setMessages] = useState<Record<string, AgentChatMessage[]>>(INITIAL_MESSAGES);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("agent-1");
  const [selectedConversationId, setSelectedConversationId] = useState<string>("conv-1");

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || null;
  const agentConversations = conversations.filter((c) => c.agentId === selectedAgentId);
  const currentMessages = messages[selectedConversationId] || [];

  const getAgents = useCallback(() => agents, [agents]);

  const getAgent = useCallback((id: string) => agents.find((a) => a.id === id) || null, [agents]);

  const createAgent = useCallback((data: CreateAgent) => {
    const now = new Date().toISOString();
    const newAgent: Agent = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    setAgents((prev) => [...prev, newAgent]);
    return newAgent;
  }, []);

  const updateAgent = useCallback((id: string, data: UpdateAgent) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...data, updatedAt: new Date().toISOString() } : a)),
    );
  }, []);

  const deleteAgent = useCallback((id: string) => {
    setAgents((prev) => prev.filter((a) => a.id !== id));
    setConversations((prev) => prev.filter((c) => c.agentId !== id));
  }, []);

  const getConversations = useCallback((agentId: string) => {
    return conversations.filter((c) => c.agentId === agentId);
  }, [conversations]);

  const createConversation = useCallback((agentId: string) => {
    const now = new Date().toISOString();
    const newConv: Conversation = {
      id: crypto.randomUUID(),
      agentId,
      title: "Nueva conversación",
      timestamp: now,
    };
    setConversations((prev) => [newConv, ...prev]);
    setSelectedConversationId(newConv.id);
    setMessages((prev) => ({ ...prev, [newConv.id]: [] }));
    return newConv;
  }, []);

  const sendMessage = useCallback((conversationId: string, content: string) => {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const userMsg: AgentChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: now,
    };

    setMessages((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), userMsg],
    }));

    setTimeout(() => {
      const assistantMsg: AgentChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `He recibido tu mensaje: "${content}". Procesando consulta contra tus memorias cifradas en MemoryChain...`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), assistantMsg],
      }));

      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, lastMessage: content, timestamp: now } : c,
        ),
      );
    }, 1000);
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
    getAgents,
    getAgent,
    createAgent,
    updateAgent,
    deleteAgent,
    getConversations,
    createConversation,
    sendMessage,
  };
}
