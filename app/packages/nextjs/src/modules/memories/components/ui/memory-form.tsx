"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Memory, MemoryType } from "../../types/memory";

const MEMORY_TYPES: { value: MemoryType; label: string }[] = [
  { value: "documento", label: "Documento" },
  { value: "texto", label: "Texto" },
  { value: "codigo", label: "Código" },
  { value: "pdf", label: "PDF" },
  { value: "enlace", label: "Enlace" },
  { value: "imagen", label: "Imagen" },
];

const memoryFormSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  description: z.string().optional(),
  type: z.enum(["documento", "texto", "codigo", "pdf", "enlace", "imagen"]),
  content: z.string().optional(),
  collectionId: z.string().optional(),
});

type MemoryFormData = z.infer<typeof memoryFormSchema>;

interface MemoryFormProps {
  memory?: Memory | null;
  onSubmit: (data: MemoryFormData) => void;
  onClose: () => void;
}

export function MemoryForm({ memory, onSubmit, onClose }: MemoryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<MemoryFormData>({
    resolver: zodResolver(memoryFormSchema as any),
    defaultValues: {
      title: "",
      description: "",
      type: "texto",
      content: "",
      collectionId: "",
    },
  });

  useEffect(() => {
    if (memory) {
      reset({
        title: memory.title,
        description: memory.description || "",
        type: memory.type,
        content: memory.content || "",
        collectionId: memory.collectionId || "",
      });
    }
  }, [memory, reset]);

  const handleFormSubmit = (data: MemoryFormData) => {
    onSubmit(data);
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-card rounded-2xl border border-border/60 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
          <h2 className="text-lg font-bold text-foreground">{memory ? "Editar memoria" : "Nueva memoria"}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <span className="material-symbols-outlined text-lg text-muted-foreground">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-foreground mb-1.5">
              Título *
            </label>
            <input
              id="title"
              type="text"
              {...register("title")}
              className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              placeholder="Nombre de la memoria"
            />
            {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1.5">
              Descripción
            </label>
            <textarea
              id="description"
              {...register("description")}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-none"
              placeholder="Descripción opcional"
            />
          </div>


          {/* Content */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-foreground mb-1.5">
              Contenido
            </label>
            <textarea
              id="content"
              {...register("content")}
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-none font-mono text-sm"
              placeholder="Contenido o URL del recurso"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border/60 bg-background text-foreground text-sm font-medium hover:bg-muted/50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50"
            >
              {memory ? "Guardar cambios" : "Crear memoria"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
