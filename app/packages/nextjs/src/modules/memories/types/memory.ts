import { z } from "zod";

export const MemoryTypeSchema = z.enum(["documento", "texto", "codigo", "pdf", "enlace", "imagen"]);

export const CollectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  count: z.number(),
});

export const MemorySchema = z.object({
  id: z.string(),
  title: z.string().min(1, "El título es requerido"),
  description: z.string().optional(),
  type: MemoryTypeSchema,
  content: z.string().optional(),
  collectionId: z.string().optional(),
  isFavorite: z.boolean().default(false),
  isArchived: z.boolean().default(false),
  fileSize: z.number().optional(),
  cid: z.string().optional(),
  hash: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateMemorySchema = MemorySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateMemorySchema = CreateMemorySchema.partial();

export type Memory = z.infer<typeof MemorySchema>;
export type MemoryType = z.infer<typeof MemoryTypeSchema>;
export type Collection = z.infer<typeof CollectionSchema>;
export type CreateMemory = z.infer<typeof CreateMemorySchema>;
export type UpdateMemory = z.infer<typeof UpdateMemorySchema>;
