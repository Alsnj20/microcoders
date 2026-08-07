"use client";

import { useState } from "react";
import { useMemory } from "../../hooks/use-memory";
import type { Memory } from "../../types/memory";
import { MemoryCard } from "../ui/memory-card";
import { MemorySidebar } from "../ui/memory-sidebar";
import { MemoryHeader } from "../ui/memory-header";
import { MemoryForm } from "../ui/memory-form";

export function MemoriesPage() {
  const {
    memories,
    collections,
    selectedCollection,
    setSelectedCollection,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    createMemory,
    updateMemory,
    deleteMemory,
    toggleFavorite,
    totalByCollection,
  } = useMemory();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);

  const handleCreateMemory = () => {
    setEditingMemory(null);
    setIsFormOpen(true);
  };

  const handleEditMemory = (memory: Memory) => {
    setEditingMemory(memory);
    setIsFormOpen(true);
  };

  const handleFormSubmit = (data: { title: string; description?: string; type: "documento" | "texto" | "codigo" | "pdf" | "enlace" | "imagen"; content?: string; collectionId?: string }) => {
    if (editingMemory) {
      updateMemory(editingMemory.id, data);
    } else {
      createMemory({ ...data, isFavorite: false });
    }
  };

  const handleDeleteMemory = (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta memoria?")) {
      deleteMemory(id);
    }
  };

  return (
    <div className="flex pt-16">
      <MemorySidebar
        collections={collections}
        selectedCollection={selectedCollection}
        onSelectCollection={setSelectedCollection}
        totalByCollection={totalByCollection}
        onCreateMemory={handleCreateMemory}
      />

      <main className="flex-1 p-6 md:p-10">
        <div className="max-w-6xl mx-auto">
          <MemoryHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            totalCount={memories.length}
          />

          {/* Memory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {memories.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                onToggleFavorite={toggleFavorite}
                onEdit={handleEditMemory}
                onDelete={handleDeleteMemory}
              />
            ))}

            {/* New Memory Card */}
            <button
              type="button"
              onClick={handleCreateMemory}
              className="p-5 rounded-2xl border-2 border-dashed border-border/60 bg-card/50 hover:border-primary/40 hover:bg-muted/20 transition-all duration-200 flex flex-col items-center justify-center min-h-[200px] text-center"
            >
              <span className="material-symbols-outlined text-4xl text-muted-foreground mb-2">
                add
              </span>
              <span className="font-semibold text-foreground mb-1">Nueva memoria</span>
              <span className="text-sm text-muted-foreground">
                Guarda cualquier tipo de información en tu cadena de memoria.
              </span>
            </button>
          </div>

          {/* Footer Note */}
          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="material-symbols-outlined text-lg">lock</span>
            <span>Todas tus memorias están cifradas de extremo a extremo y almacenadas en IPFS.</span>
          </div>
        </div>
      </main>

      {/* Form Modal */}
      {isFormOpen && (
        <MemoryForm
          memory={editingMemory}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setIsFormOpen(false);
            setEditingMemory(null);
          }}
        />
      )}
    </div>
  );
}
