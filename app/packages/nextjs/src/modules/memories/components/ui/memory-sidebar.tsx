"use client";

import type { Collection } from "../../types/memory";

interface MemorySidebarProps {
  collections: Collection[];
  selectedCollection: string;
  onSelectCollection: (id: string) => void;
  totalByCollection: Record<string, number>;
  onCreateMemory: () => void;
}

export function MemorySidebar({
  collections,
  selectedCollection,
  onSelectCollection,
  totalByCollection,
  onCreateMemory,
}: MemorySidebarProps) {
  return (
    <aside className="hidden lg:block w-64 min-h-[calc(100vh-4rem)] border-r border-border/40 p-6">
      <button
        type="button"
        onClick={onCreateMemory}
        className="w-full bg-primary text-primary-foreground font-semibold py-3 px-4 rounded-xl mb-8 flex items-center justify-center gap-2 hover:opacity-90 transition-all"
      >
        <span className="material-symbols-outlined text-lg">add</span>
        Nueva memoria
      </button>

      <div className="text-xs font-semibold text-muted-foreground tracking-wider mb-4">
        MIS COLECCIONES
      </div>
      <div className="space-y-1">
        {collections.map((col) => (
          <button
            key={col.id}
            type="button"
            onClick={() => onSelectCollection(col.id)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
              selectedCollection === col.id
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-lg">{col.icon}</span>
              <span>{col.name}</span>
            </div>
            <span className="text-xs">{totalByCollection[col.id] || 0}</span>
          </button>
        ))}
      </div>

      {/* Banner */}
      <div className="mt-12 p-5 rounded-2xl bg-muted/50 border border-border/40">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">👾</span>
          <div>
            <p className="text-sm font-semibold text-foreground">Tus memorias.</p>
            <p className="text-sm font-semibold text-foreground">Tu propiedad.</p>
            <p className="text-sm font-semibold text-foreground">Tu control.</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">En blockchain, para siempre.</p>
      </div>

      {/* Network Badge */}
      <div className="mt-6 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/40">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="text-sm text-muted-foreground">Arbitrum Stylus</span>
      </div>
    </aside>
  );
}
