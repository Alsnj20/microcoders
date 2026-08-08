"use client";

import {
  LateralBar,
  LateralBarContent,
  LateralBarFooter,
  LateralBarSection,
  LateralBarSectionButton,
} from "../../../../../components/ui/lateral-bar";
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
    <LateralBar>
      {/* New Memory Button */}
      <div className="px-4 pt-6">
        <button
          type="button"
          onClick={onCreateMemory}
          className="w-full bg-primary text-primary-foreground font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Nueva memoria
        </button>
      </div>

      <LateralBarContent>
        {/* Collections List */}
        <LateralBarSection title="MIS COLECCIONES">
          {collections.map(col => (
            <LateralBarSectionButton
              key={col.id}
              onClick={() => onSelectCollection(col.id)}
              isActive={selectedCollection === col.id}
              icon={col.icon}
            >
              <div className="flex items-center justify-between flex-1">
                <span>{col.name}</span>
                <span className="text-xs text-muted-foreground">{totalByCollection[col.id] || 0}</span>
              </div>
            </LateralBarSectionButton>
          ))}
        </LateralBarSection>
      </LateralBarContent>

      {/* Banner */}
      <LateralBarFooter>
        <div className="p-5 rounded-2xl bg-muted/50 border border-border/40 mb-4">
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
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/40">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm text-muted-foreground">Arbitrum Stylus</span>
        </div>
      </LateralBarFooter>
    </LateralBar>
  );
}
