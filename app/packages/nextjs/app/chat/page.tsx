"use client";

import { useState } from "react";

import { AgentChatHeader } from "@/components/chat/AgentChatHeader";
import { AgentChatInput } from "@/components/chat/AgentChatInput";
import { AgentChatMessage, type MessageProps } from "@/components/chat/AgentChatMessage";
import { AgentChatSidebar } from "@/components/chat/AgentChatSidebar";

const INITIAL_MESSAGES: MessageProps[] = [
  {
    id: "1",
    role: "assistant",
    avatarUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBUmXEidBO3zpY2rMxk3Oa3i1XCq9JMTtX2Y9Sdn73ycyngQdB2pmkTY3ahd-shRj26UBLDhdxlwfYjkteWRxaQCRUKifpT6JjM-TY_3heKXwGniuOyNrEOImrIPRuSmoY2d1pfaHODuGeGwNtyC3KLGCVhKxpt2tc_xE8QCJgxmyb66xqmZMI78lW4qAVuwwRaUB7X___-CJWsYXH8NzEmiuCsHog1vg35BEOKqDtpQGv5Ve-qfI3I",
    content:
      "Here is the latest analysis on the Solana network performance metrics you requested. Throughput has remained steady at 2,400 TPS over the last hour.",
  },
  {
    id: "2",
    role: "user",
    avatarUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCW8LUo9gm27dPmMFaHiMdj3UbYIv49SlmZ4WMcAnEsydpgz2LatC5HD8l3AGrVqpcq4qzI9RrxsSQgFSuWfYKZuNS6AOoRYrcuPizgq76APhWr_caPMr9Wvu2r0vEQxTrNCnVdIOhkoXauiZQP9WtG8s0X4acUrSGrwL_RS-pdrDOOEnB1R2WeILBHevRL2PgLUJRMyk3PCznh4zJquJr5-FDs_Tx5mTj0k6V8g8sEjrGyn_7sNsFH",
    content: "Excellent. Can you cross-reference that with the recent validator updates?",
  },
  {
    id: "3",
    role: "assistant",
    avatarUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDYaJBtRDB2tJT9hUrnT3m_8MGmZa7pQV8P6hzrTCan9fFus8dGZB-9_tAR7SIoH2WvYEygS9KJ1eKx6eoQPzcx474Jd80UtSGaEgXBGNH5HXZYZr0DZD2YMuoEhaEgXeqAzX4tey__MzA8LgCBCfLoR_DamKgodREjtEJrKFZYgqNrfWoT6ydwTGRy58nbqNbwsW5IlbLyqUCuk80xbm9Hu1be2iO5PY5MLQhl3EVPjLwqC4rqaXmF",
    content:
      "Certainly. Cross-referencing current throughput with the v1.16 validator rollout indicates a 15% efficiency increase in block propagation times across updated nodes.",
    systemLog: "> SYSTEM LOG: VALIDATOR_VERSION_CHECK COMPLETED. STATUS: NOMINAL.",
  },
];

export default function AgentChatNaturalPage() {
  const [messages, setMessages] = useState<MessageProps[]>(INITIAL_MESSAGES);

  const handleSendMessage = (text: string) => {
    const userMsg: MessageProps = {
      id: Date.now().toString(),
      role: "user",
      avatarUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCW8LUo9gm27dPmMFaHiMdj3UbYIv49SlmZ4WMcAnEsydpgz2LatC5HD8l3AGrVqpcq4qzI9RrxsSQgFSuWfYKZuNS6AOoRYrcuPizgq76APhWr_caPMr9Wvu2r0vEQxTrNCnVdIOhkoXauiZQP9WtG8s0X4acUrSGrwL_RS-pdrDOOEnB1R2WeILBHevRL2PgLUJRMyk3PCznh4zJquJr5-FDs_Tx5mTj0k6V8g8sEjrGyn_7sNsFH",
      content: text,
    };

    const botMsg: MessageProps = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      avatarUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBUmXEidBO3zpY2rMxk3Oa3i1XCq9JMTtX2Y9Sdn73ycyngQdB2pmkTY3ahd-shRj26UBLDhdxlwfYjkteWRxaQCRUKifpT6JjM-TY_3heKXwGniuOyNrEOImrIPRuSmoY2d1pfaHODuGeGwNtyC3KLGCVhKxpt2tc_xE8QCJgxmyb66xqmZMI78lW4qAVuwwRaUB7X___-CJWsYXH8NzEmiuCsHog1vg35BEOKqDtpQGv5Ve-qfI3I",
      content: `I've received your request: "${text}". Processing data against AgentOS memory nodes...`,
      systemLog: "> SYSTEM LOG: QUERY_DISPATCHED. STATUS: PROCESSING.",
    };

    setMessages(prev => [...prev, userMsg, botMsg]);
  };

  return (
    <div className="flex h-screen overflow-hidden font-['Hanken_Grotesk'] text-foreground bg-background">
      {/* Side Navigation Bar */}
      <AgentChatSidebar />

      {/* Main Content Workspace */}
      <main className="ml-70 flex-1 flex flex-col h-full bg-background relative">
        {/* Top App Bar Header */}
        <AgentChatHeader />

        {/* Chat Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide flex flex-col items-center">
          <div className="w-full max-w-4xl flex flex-col gap-6 pt-4 pb-28">
            {messages.map(msg => (
              <AgentChatMessage key={msg.id} {...msg} />
            ))}
          </div>
        </div>

        {/* Bottom Input Composer */}
        <AgentChatInput onSendMessage={handleSendMessage} />
      </main>
    </div>
  );
}
