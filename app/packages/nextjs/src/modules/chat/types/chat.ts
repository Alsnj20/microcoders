export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  avatarUrl: string;
  content: string;
  timestamp: string;
  agentId?: string;
  systemLog?: string;
  memoryCid?: string;
  creditsUsed?: number;
}

export interface AgentBlueprint {
  id: string;
  name: string;
  description: string;
  icon: string;
  version: string;
  blueprintCid: string;
  active: boolean;
}

export interface MemoryNode {
  id: string;
  title: string;
  hash: string;
  cid: string;
  version: number;
}

export interface ChatConversation {
  id: string;
  onChainId?: string;
  title: string;
  cid?: string;
  lastMessage?: string;
  timestamp: string;
}

export interface UserProtocolState {
  username: string;
  walletAddress?: string;
  memoryCredits: number;
  activeAgentId: string;
}
