export interface MemoryData {
  memoryId: string;
  owner: string;
  name: string;
  cid: string;
  hash: string;
  memoryType: number;
  visibility: number;
  status: number;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface MemoryVersionData {
  version: number;
  cid: string;
  hash: string;
  createdAt: number;
}

export interface ContractResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface MemoryRegistryContract {
  createMemory(
    owner: string,
    name: string,
    cid: string,
    hash: string,
    memoryType: number,
    visibility: number,
  ): Promise<ContractResult<string>>;

  updateMemory(
    owner: string,
    memoryId: string,
    cid: string,
    hash: string,
  ): Promise<ContractResult<void>>;

  archiveMemory(owner: string, memoryId: string): Promise<ContractResult<void>>;

  restoreMemory(owner: string, memoryId: string): Promise<ContractResult<void>>;

  getMemory(memoryId: string): Promise<ContractResult<MemoryData>>;

  getMemoryVersion(
    memoryId: string,
    version: number,
  ): Promise<ContractResult<MemoryVersionData>>;

  getMemoryCountByOwner(owner: string): Promise<ContractResult<number>>;

  getMemoriesByOwner(
    owner: string,
    offset: number,
    limit: number,
  ): Promise<ContractResult<MemoryData[]>>;
}

export interface AgentData {
  agentId: string;
  owner: string;
  name: string;
  description: string;
  cid: string;
  hash: string;
  status: number;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface AgentVersionData {
  version: number;
  cid: string;
  hash: string;
  createdAt: number;
}

export interface AgentRegistryContract {
  createAgent(
    owner: string,
    name: string,
    description: string,
    cid: string,
    hash: string,
  ): Promise<ContractResult<string>>;

  updateAgent(
    owner: string,
    agentId: string,
    cid: string,
    hash: string,
  ): Promise<ContractResult<void>>;

  archiveAgent(owner: string, agentId: string): Promise<ContractResult<void>>;

  restoreAgent(owner: string, agentId: string): Promise<ContractResult<void>>;

  getAgent(agentId: string): Promise<ContractResult<AgentData>>;

  getAgentVersion(
    agentId: string,
    version: number,
  ): Promise<ContractResult<AgentVersionData>>;

  getAgentCountByOwner(owner: string): Promise<ContractResult<number>>;

  getAgentsByOwner(
    owner: string,
    offset: number,
    limit: number,
  ): Promise<ContractResult<AgentData[]>>;
}

export interface ContextData {
  contextId: string;
  agentId: string;
  memoryId: string;
  priority: number;
  enabled: boolean;
  createdAt: number;
}

export interface ContextRegistryContract {
  linkMemory(
    owner: string,
    agentId: string,
    memoryId: string,
    priority: number,
  ): Promise<ContractResult<string>>;

  unlinkMemory(
    owner: string,
    agentId: string,
    memoryId: string,
  ): Promise<ContractResult<void>>;

  changePriority(
    owner: string,
    contextId: string,
    newPriority: number,
  ): Promise<ContractResult<void>>;

  disableLink(owner: string, contextId: string): Promise<ContractResult<void>>;

  enableLink(owner: string, contextId: string): Promise<ContractResult<void>>;

  getContext(contextId: string): Promise<ContractResult<ContextData>>;

  getAgentContextCount(agentId: string): Promise<ContractResult<number>>;

  getAgentContexts(
    agentId: string,
    offset: number,
    limit: number,
  ): Promise<ContractResult<ContextData[]>>;
}

export interface CreditBalance {
  balance: number;
  purchased: number;
  spent: number;
}

export interface FeeSchedule {
  registerUser: number;
  createMemory: number;
  updateMemory: number;
  createAgent: number;
  updateAgent: number;
  executeAgent: number;
  linkMemory: number;
}

export interface PricingConfig {
  isTestnet: boolean;
  treasury: string;
  pricePerCredit: string;
  minPurchase: string;
  maxPurchase: string;
}

export interface CreditManagerContract {
  balanceOf(user: string): Promise<ContractResult<CreditBalance>>;

  hasSufficientCredits(user: string, amount: number): Promise<ContractResult<boolean>>;

  getFees(): Promise<ContractResult<FeeSchedule>>;

  getPricing(): Promise<ContractResult<PricingConfig>>;
}

export interface UserData {
  address: string;
  username: string | null;
  isRegistered: boolean;
  isActive: boolean;
  totalAgents: number;
  totalMemories: number;
  createdAt: number;
}

export interface UserRegistryContract {
  registerUser(owner: string, username: string): Promise<ContractResult<void>>;

  updateUsername(owner: string, username: string): Promise<ContractResult<void>>;

  getUser(owner: string): Promise<ContractResult<UserData>>;
}

export interface AuditEvent {
  eventId: string;
  actor: string;
  entityType: number;
  entityId: string;
  action: number;
  timestamp: number;
}

export interface AuditRegistryContract {
  recordAudit(
    actor: string,
    entityType: number,
    entityId: string,
    action: number,
  ): Promise<ContractResult<string>>;

  getAuditEvent(eventId: string): Promise<ContractResult<AuditEvent>>;

  getTotalEvents(): Promise<ContractResult<number>>;
}
