"use client";

import { useEffect, useRef, useState } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <>
      <div className="min-h-50 group p-5 rounded-2xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-200">
        <div className="flex items-start justify-between mb-3">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${typeInfo.color}`}>{typeInfo.label}</span>
          <div className="flex items-center">
            {/* Star favorite toggle */}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onToggleFavorite(memory.id); }}
              className="transition-colors"
            >
              <span
                className={`material-symbols-outlined text-md ${memory.isFavorite ? "text-yellow-500 hover:text-yellow-400" : "text-muted-foreground hover:text-muted-foreground/80"}`}
              >
                {memory.isFavorite ? "star" : "star_border"}
              </span>
            </button>

            {/* Three dot menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                className="rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-md text-muted-foreground hover:text-muted-foreground/80">more_vert</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-xl shadow-lg z-10 py-1">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); onEdit(memory); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">edit</span>
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setMenuOpen(false); setShowDeleteModal(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">archive</span>
                    Archivar
                  </button>
                </div>
              )}
            </div>
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-card rounded-2xl border border-border shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-destructive">delete</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Eliminar memoria</h3>
                <p className="text-sm text-muted-foreground">¿Estás seguro?</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              La memoria &ldquo;{memory.title}&rdquo; será archivada. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-foreground rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { onDelete(memory.id); setShowDeleteModal(false); }}
                className="px-4 py-2 text-sm font-medium text-white bg-destructive rounded-lg hover:bg-destructive/90 transition-colors"
              >
                Archivar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
