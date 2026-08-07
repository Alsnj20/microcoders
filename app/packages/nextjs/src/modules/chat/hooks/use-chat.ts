"use client";

import { useState } from "react";
import type { ChatMessage, AgentBlueprint, UserProtocolState } from "../types/chat";

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    role: "assistant",
    avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBUmXEidBO3zpY2rMxk3Oa3i1XCq9JMTtX2Y9Sdn73ycyngQdB2pmkTY3ahd-shRj26UBLDhdxlwfYjkteWRxaQCRUKifpT6JjM-TY_3heKXwGniuOyNrEOImrIPRuSmoY2d1pfaHODuGeGwNtyC3KLGCVhKxpt2tc_xE8QCJgxmyb66xqmZMI78lW4qAVuwwRaUB7X___-CJWsYXH8NzEmiuCsHog1vg35BEOKqDtpQGv5Ve-qfI3I",
    content: "¡Hola! Soy tu agente personal en MemoryChain. He cargado tu gráfico de conocimiento cifrado desde IPFS y Arbitrum Stylus.",
    systemLog: "> SYSTEM LOG: MEMORY_REGISTRY_LOADED. SHA-256 HASH VERIFIED.",
    creditsUsed: 0,
  },
  {
    id: "2",
    role: "user",
    avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCW8LUo9gm27dPmMFaHiMdj3UbYIv49SlmZ4WMcAnEsydpgz2LatC5HD8l3AGrVqpcq4qzI9RrxsSQgFSuWfYKZuNS6AOoRYrcuPizgq76APhWr_caPMr9Wvu2r0vEQxTrNCnVdIOhkoXauiZQP9WtG8s0X4acUrSGrwL_RS-pdrDOOEnB1R2WeILBHevRL2PgLUJRMyk3PCznh4zJquJr5-FDs_Tx5mTj0k6V8g8sEjrGyn_7sNsFH",
    content: "¿Cuál es el estado actual de la sincronización de memorias entre mis agentes?",
  },
  {
    id: "3",
    role: "assistant",
    avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDYaJBtRDB2tJT9hUrnT3m_8MGmZa7pQV8P6hzrTCan9fFus8dGZB-9_tAR7SIoH2WvYEygS9KJ1eKx6eoQPzcx474Jd80UtSGaEgXBGNH5HXZYZr0DZD2YMuoEhaEgXeqAzX4tey__MzA8LgCBCfLoR_DamKgodREjtEJrKFZYgqNrfWoT6ydwTGRy58nbqNbwsW5IlbLyqUCuk80xbm9Hu1be2iO5PY5MLQhl3EVPjLwqC4rqaXmF",
    content: "La relación N:M en ContextRegistry está activa. Los agentes 'Trading Bot' y 'Personal Assistant' comparten la memoria 'Knowledge Base v1.4' sin duplicar datos.",
    systemLog: "> SYSTEM LOG: CONTEXT_REGISTRY_CHECK. STATUS: NOMINAL (N:M RELATIONS OK).",
    memoryCid: "ipfs://QmX9z7p2W8hF9aK",
    creditsUsed: 2,
  },
];

const INITIAL_AGENTS: AgentBlueprint[] = [
  {
    id: "trading-bot",
    name: "Trading Assistant",
    description: "Analista de DeFi & Yields",
    icon: "smart_toy",
    version: "v1.4.0",
    blueprintCid: "ipfs://bafybeic2...",
    active: true,
  },
  {
    id: "research-agent",
    name: "Research Agent",
    description: "Agente de investigación sobre Web3 & Stylus",
    icon: "psychology",
    version: "v1.0.2",
    blueprintCid: "ipfs://bafybeic5...",
    active: false,
  },
];

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [agents] = useState<AgentBlueprint[]>(INITIAL_AGENTS);
  const [userState, setUserState] = useState<UserProtocolState>({
    username: "CryptoEnthusiast",
    memoryCredits: 1240,
    activeAgentId: "trading-bot",
  });

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCW8LUo9gm27dPmMFaHiMdj3UbYIv49SlmZ4WMcAnEsydpgz2LatC5HD8l3AGrVqpcq4qzI9RrxsSQgFSuWfYKZuNS6AOoRYrcuPizgq76APhWr_caPMr9Wvu2r0vEQxTrNCnVdIOhkoXauiZQP9WtG8s0X4acUrSGrwL_RS-pdrDOOEnB1R2WeILBHevRL2PgLUJRMyk3PCznh4zJquJr5-FDs_Tx5mTj0k6V8g8sEjrGyn_7sNsFH",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const costInMc = 2;

    const botMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBUmXEidBO3zpY2rMxk3Oa3i1XCq9JMTtX2Y9Sdn73ycyngQdB2pmkTY3ahd-shRj26UBLDhdxlwfYjkteWRxaQCRUKifpT6JjM-TY_3heKXwGniuOyNrEOImrIPRuSmoY2d1pfaHODuGeGwNtyC3KLGCVhKxpt2tc_xE8QCJgxmyb66xqmZMI78lW4qAVuwwRaUB7X___-CJWsYXH8NzEmiuCsHog1vg35BEOKqDtpQGv5Ve-qfI3I",
      content: `He recibido tu solicitud: "${text}". Procesando consulta contra tus nodos de memoria cifrados en MemoryChain...`,
      systemLog: `> SYSTEM LOG: QUERY_DISPATCHED. CONSUMED ${costInMc} MC. SHA-256 HASH VERIFIED.`,
      creditsUsed: costInMc,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setUserState((prev) => ({
      ...prev,
      memoryCredits: Math.max(0, prev.memoryCredits - costInMc),
    }));
  };

  return {
    messages,
    agents,
    userState,
    sendMessage,
  };
}
