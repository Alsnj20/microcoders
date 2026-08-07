export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  avatarUrl: string;
  content: string;
  systemLog?: string;
  timestamp?: string;
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

export interface UserProtocolState {
  username: string;
  walletAddress?: string;
  memoryCredits: number;
  activeAgentId: string;
}
