"use client";

import type { Memory } from "../../types/memory";

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  documento: { label: "DOCUMENTO", color: "bg-primary/10 text-primary" },
  texto: { label: "TEXTO", color: "bg-muted text-muted-foreground" },
  codigo: { label: "CÓDIGO", color: "bg-primary/10 text-primary" },
  pdf: { label: "PDF", color: "bg-destructive/10 text-destructive" },
  enlace: { label: "ENLACE", color: "bg-secondary/10 text-secondary" },
  imagen: { label: "IMAGEN", color: "bg-primary/10 text-primary" },
};

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface MemoryCardProps {
  memory: Memory;
  onToggleFavorite: (id: string) => void;
  onEdit: (memory: Memory) => void;
  onDelete: (id: string) => void;
}

export function MemoryCard({ memory, onToggleFavorite, onEdit, onDelete }: MemoryCardProps) {
  return (
    <div className="group flex flex-col justify-between p-3.5 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-sm text-primary">description</span>
          </div>
          <h3 className="font-semibold text-foreground text-sm truncate">{memory.title}</h3>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onToggleFavorite(memory.id)}
            className={`p-1 rounded-md hover:bg-muted transition-all ${
              memory.isFavorite ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
            title={memory.isFavorite ? "Quitar de favoritos" : "Marcar como favorito"}
          >
            <span
              className={`material-symbols-outlined text-base ${
                memory.isFavorite ? "text-amber-500 fill-amber-500" : "text-muted-foreground"
              }`}
            >
              {memory.isFavorite ? "star" : "star_border"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onEdit(memory)}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all opacity-0 group-hover:opacity-100"
            title="Editar"
          >
            <span className="material-symbols-outlined text-base">edit</span>
          </button>
          <button
            type="button"
            onClick={() => onDelete(memory.id)}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-destructive transition-all opacity-0 group-hover:opacity-100"
            title="Archivar"
          >
            <span className="material-symbols-outlined text-base">delete</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-auto">
        <span className="material-symbols-outlined text-xs">schedule</span>
        <span>{memory.createdAt}</span>
        {memory.fileSize && (
          <>
            <span>•</span>
            <span>{formatFileSize(memory.fileSize)}</span>
          </>
        )}
      </div>
    </div>
  );
}
