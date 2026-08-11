"use client";

import { useState, useEffect } from "react";
import { Button } from "~~/components/ui/button";
import { Input } from "~~/components/ui/input";
import { LateralBar, LateralBarContent, LateralBarSection, LateralBarSectionButton } from "~~/components/ui/lateral-bar";
import { SlidePanel } from "~~/components/shared/SlidePanel";
import { useMemory } from "../../hooks/use-memory";
import type { Memory, MemoryType } from "../../types/memory";
import { MemoryCard } from "../ui/memory-card";

const TYPE_ICONS: Record<string, string> = {
  documento: "description",
  texto: "article",
  codigo: "code",
  pdf: "picture_as_pdf",
  enlace: "link",
  imagen: "image",
};

export default function MemoriesPage() {
  const {
    memories,
    collections,
    selectedCollection,
    setSelectedCollection,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    getMemory,
    createMemory,
    updateMemory,
    deleteMemory,
    toggleFavorite,
    totalByCollection,
    archivedCount,
  } = useMemory();

  const [showPanel, setShowPanel] = useState<"create" | "edit" | "detail" | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [formData, setFormData] = useState<{ title: string; description: string; type: MemoryType; content: string }>({
    title: "",
    description: "",
    type: "documento",
    content: "",
  });

  const filteredMemories = memories
    .filter(m => {
      if (selectedCollection === "favorites") return m.isFavorite;
      if (selectedCollection === "archived") return (m as any).isArchived;
      return !(m as any).isArchived;
    })
    .filter(m => {
      if (!searchQuery) return true;
      return m.title.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.title.localeCompare(b.title);
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });


  const handleCreate = () => {
    setFormData({ title: "", description: "", type: "documento", content: "" });
    setShowPanel("create");
  };

  const handleViewDetail = async (memory: Memory) => {
    let full = memory;
    try {
      full = (await getMemory(memory.id)) ?? memory;
    } catch (err) {
      console.error("Failed to load memory content:", err);
    }
    setSelectedMemory(full);
    setShowPanel("detail");
  };

  const handleEdit = async (memory: Memory) => {
    let full = memory;
    try {
      full = (await getMemory(memory.id)) ?? memory;
    } catch (err) {
      console.error("Failed to load memory content:", err);
    }
    setSelectedMemory(full);
    setFormData({
      title: full.title,
      description: full.description || "",
      type: full.type,
      content: full.content ?? "",
    });
    setShowPanel("edit");
  };

  const handleDelete = (id: string) => {
    if (!confirm("¿Archivar esta memoria?")) return;
    deleteMemory(id);
  };

  const handleFormSubmit = async () => {
    try {
      if (showPanel === "edit" && selectedMemory) {
        await updateMemory(selectedMemory.id, formData);
      } else {
        await createMemory({ ...formData, isFavorite: false });
      }
      setShowPanel(null);
      setSelectedMemory(null);
    } catch (e) {
      console.error("Form error:", e);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Sidebar */}
      <LateralBar width="lg">
        <div className="px-4 py-2">
          <button
            type="button"
            onClick={handleCreate}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Nueva memoria
          </button>
        </div>

        <LateralBarContent>
          <LateralBarSection title="COLECCIONES">
            {collections.map(col => (
              <LateralBarSectionButton
                key={col.id}
                onClick={() => setSelectedCollection(col.id)}
                isActive={selectedCollection === col.id}
                icon={col.icon}
              >
                <div className="flex-1 flex items-center justify-between">
                  <span>{col.name}</span>
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({totalByCollection[col.id] || 0})</span>
                </div>
              </LateralBarSectionButton>
            ))}

            <LateralBarSectionButton
              onClick={() => setSelectedCollection("archived")}
              isActive={selectedCollection === "archived"}
              icon="archive"
            >
              <div className="flex-1 flex items-center justify-between">
                <span>Archivados </span>
                <span className="ml-1 text-xs text-muted-foreground">({archivedCount})</span>
              </div>
            </LateralBarSectionButton>
          </LateralBarSection>
        </LateralBarContent>

        {/* Promo Card */}
        <div className="px-4 pb-4">
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
            <span className="text-3xl mb-2 block">📂</span>
            <p className="text-xs font-semibold text-foreground">Tus memorias.</p>
            <p className="text-xs font-semibold text-foreground">Tu propiedad.</p>
            <p className="text-xs font-semibold text-foreground">Tu control.</p>
            <p className="text-xs text-muted-foreground mt-1">En blockchain, para siempre.</p>
          </div>
        </div>
      </LateralBar>

      {/* Center — Memory Grid */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-6xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Mis memorias</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {memories.length} memorias guardadas en IPFS
              </p>
            </div>
            {/* <Button onClick={handleCreate}>
              <span className="material-symbols-outlined text-lg">add</span>
              Nueva memoria
            </Button> */}
          </div>

          {/* Search + Sort */}
          <div className="flex gap-3 mb-6">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">search</span>
              <Input
                placeholder="Buscar memorias..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-lg border border-input bg-transparent text-sm text-foreground"
            >
              <option value="recent">Más recientes</option>
              <option value="name">Nombre</option>
              <option value="oldest">Más antiguas</option>
            </select>
          </div>

          {/* Memory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredMemories.map(memory => (
              <div
                key={memory.id}
                onClick={() => handleViewDetail(memory)}
                className="cursor-pointer"
              >
                <MemoryCard
                  memory={memory}
                  onToggleFavorite={toggleFavorite}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </div>
            ))}

            {/* New Memory Card */}
            <button
              type="button"
              onClick={handleCreate}
              className="p-3.5 rounded-xl border-2 border-dashed border-border/60 bg-card/50 hover:border-primary/40 hover:bg-muted/20 transition-all duration-200 flex flex-col items-center justify-center text-center"
            >
              <span className="material-symbols-outlined text-2xl text-muted-foreground mb-0.5">add</span>
              <span className="font-semibold text-foreground text-xs mb-0.5">Nueva memoria</span>
              <span className="text-[11px] text-muted-foreground">
                Guarda cualquier tipo de información.
              </span>
            </button>
          </div>

          {/* Footer */}
          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="material-symbols-outlined text-lg">lock</span>
            <span>Tus memorias están cifradas de extremo a extremo y almacenadas en IPFS.</span>
          </div>
        </div>
      </main>

      {/* Right Slide Panel — Detail / Create / Edit */}
      <SlidePanel
        title={
          showPanel === "detail" ? "Detalle de memoria" :
            showPanel === "create" ? "Nueva memoria" :
              "Editar memoria"
        }
        open={showPanel !== null}
        onClose={() => { setShowPanel(null); setSelectedMemory(null); }}
      >
        {showPanel === "detail" && selectedMemory ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">
                  {TYPE_ICONS[selectedMemory.type] || "description"}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  {selectedMemory.type}
                </p>
                <h3 className="text-lg font-semibold text-foreground">{selectedMemory.title}</h3>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground mb-1">Contenido</p>
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                  {selectedMemory.content || "Sin contenido"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground mb-1">Descripción</p>
                <p className="text-sm text-foreground">{selectedMemory.description || "Sin descripción"}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground mb-1">CID</p>
                <p className="text-sm text-foreground font-mono break-all">{selectedMemory.cid}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground mb-1">Hash</p>
                <p className="text-sm text-foreground font-mono break-all">{selectedMemory.hash}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Creado</p>
                  <p className="text-sm text-foreground">{selectedMemory.createdAt}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Colección</p>
                  <p className="text-sm text-foreground">{selectedMemory.collectionId}</p>
                </div>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={() => { handleEdit(selectedMemory); }}>
              <span className="material-symbols-outlined text-sm">edit</span>
              Editar memoria
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Título</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Nombre de la memoria"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Descripción</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                placeholder="Descripción breve..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Contenido</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                placeholder="Contenido de la memoria"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowPanel(null); setSelectedMemory(null); }}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleFormSubmit}>
                {showPanel === "edit" ? "Guardar cambios" : "Crear memoria"}
              </Button>
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
