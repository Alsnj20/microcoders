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
  const typeInfo = TYPE_LABELS[memory.type] || TYPE_LABELS.texto;

  return (
    <div className="min-h-50 group p-5 rounded-2xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${typeInfo.color}`}>{typeInfo.label}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onToggleFavorite(memory.id)}
            className="p-1 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <span
              className={`material-symbols-outlined text-lg ${memory.isFavorite ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`}
            >
              {memory.isFavorite ? "star" : "star_border"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onEdit(memory)}
            className="p-1 rounded-lg hover:bg-muted/50 transition-colors opacity-0 group-hover:opacity-100"
          >
            <span className="material-symbols-outlined text-lg text-muted-foreground">edit</span>
          </button>
          <button
            type="button"
            onClick={() => onDelete(memory.id)}
            className="p-1 rounded-lg hover:bg-muted/50 transition-colors opacity-0 group-hover:opacity-100"
          >
            <span className="material-symbols-outlined text-lg text-muted-foreground">delete</span>
          </button>
        </div>
      </div>

      <h3 className="font-bold text-foreground mb-1.5 line-clamp-1">{memory.title}</h3>
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{memory.description}</p>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="material-symbols-outlined text-sm">schedule</span>
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
