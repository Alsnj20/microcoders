export interface SessionKeyData {
  keyId: string;
  address: string;
  sessionKeyAddress: string;
  /** AES-GCM encrypted session key private key (only present when backend signs). */
  privateKeyEncrypted?: string;
  permissionsContext: string;
  expiry: number;
  scopes: string[];
  grantedAt: number;
}

export interface SessionKeyStore {
  save(key: SessionKeyData): Promise<void>;
  get(address: string, keyId: string): Promise<SessionKeyData | null>;
  list(address: string): Promise<SessionKeyData[]>;
  delete(address: string, keyId: string): Promise<boolean>;
  validate(address: string, keyId: string, operation: string): Promise<{
    valid: boolean;
    isActive: boolean;
    hasScope: boolean;
    expiry: number;
    remainingSeconds: number;
  }>;
}

export interface SessionStore {
  get(sessionId: string): Promise<SessionData | null>;
  set(sessionId: string, data: SessionData, ttlSeconds: number): Promise<void>;
  delete(sessionId: string): Promise<void>;
}

export interface SessionData {
  address: string;
  chainId: number;
  username: string | null;
}
