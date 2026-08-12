import { z } from "zod";

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  icon: z.string().default("🤖"),
  personality: z.string().optional(),
  instructions: z.string().optional(),
  model: z.string().optional(),
  tools: z.array(z.string()).optional(),
  connectedMemories: z.array(z.string()).default([]),
  persistentMemory: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateAgentSchema = AgentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateAgentSchema = CreateAgentSchema.partial();

export const ConversationSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  title: z.string(),
  lastMessage: z.string().optional(),
  timestamp: z.string(),
});

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.string(),
});

export type Agent = z.infer<typeof AgentSchema>;
export type AgentModel = string;
export type CreateAgent = z.infer<typeof CreateAgentSchema>;
export type UpdateAgent = z.infer<typeof UpdateAgentSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type AgentChatMessage = z.infer<typeof ChatMessageSchema>;
