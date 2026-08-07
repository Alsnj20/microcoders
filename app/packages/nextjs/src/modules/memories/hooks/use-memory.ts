"use client";

import { useCallback, useMemo, useState } from "react";
import type { Collection, CreateMemory, Memory, UpdateMemory } from "../types/memory";

const INITIAL_COLLECTIONS: Collection[] = [
  { id: "all", name: "Todas las memorias", icon: "grid_view", count: 8 },
  { id: "favorites", name: "Favoritas", icon: "star", count: 2 },
  { id: "research", name: "Research Agent", icon: "science", count: 3 },
  { id: "projects", name: "Proyectos", icon: "folder", count: 2 },
  { id: "personal", name: "Personal", icon: "person", count: 1 },
];

const INITIAL_MEMORIES: Memory[] = [
  {
    id: "1",
    title: "LangChain: Introducción",
    description: "Notas sobre los conceptos clave de LangChain y su arquitectura.",
    type: "documento",
    collectionId: "research",
    isFavorite: true,
    fileSize: 5324,
    createdAt: "2024-05-12",
    updatedAt: "2024-05-12",
  },
  {
    id: "2",
    title: "Ideas para mi agente",
    description: "Brainstorming de funcionalidades y posibles casos de uso.",
    type: "texto",
    collectionId: "personal",
    isFavorite: false,
    fileSize: 1126,
    createdAt: "2024-05-11",
    updatedAt: "2024-05-11",
  },
  {
    id: "3",
    title: "Prompt: Research Agent",
    description: "Prompt base para el agente de investigación y recuperación.",
    type: "codigo",
    collectionId: "research",
    isFavorite: true,
    fileSize: 2764,
    createdAt: "2024-05-10",
    updatedAt: "2024-05-10",
  },
  {
    id: "4",
    title: "Documentación Oficial",
    description: "Documentación oficial de LangChain (versión 0.2).",
    type: "pdf",
    collectionId: "research",
    isFavorite: false,
    fileSize: 1363148,
    createdAt: "2024-05-10",
    updatedAt: "2024-05-10",
  },
  {
    id: "5",
    title: "Paper: Attention is All You Need",
    description: "Artículo técnico sobre el mecanismo de atención en Transformers.",
    type: "enlace",
    collectionId: "research",
    isFavorite: false,
    fileSize: undefined,
    content: "https://arxiv.org/abs/1706.03762",
    createdAt: "2024-05-09",
    updatedAt: "2024-05-09",
  },
  {
    id: "6",
    title: "Arquitectura del agente",
    description: "Diagrama de la arquitectura del sistema multi-agente.",
    type: "imagen",
    collectionId: "projects",
    isFavorite: true,
    fileSize: 131072,
    createdAt: "2024-05-08",
    updatedAt: "2024-05-08",
  },
  {
    id: "7",
    title: "Notas de arquitectura",
    description: "Decisiones de diseño y arquitectura para el sistema multi-agente.",
    type: "documento",
    collectionId: "projects",
    isFavorite: false,
    fileSize: 3686,
    createdAt: "2024-05-07",
    updatedAt: "2024-05-07",
  },
  {
    id: "8",
    title: "Resumen de reunión",
    description: "Puntos clave de la reunión sobre el MVP del agente.",
    type: "texto",
    collectionId: "personal",
    isFavorite: false,
    fileSize: 900,
    createdAt: "2024-05-07",
    updatedAt: "2024-05-07",
  },
];

export function useMemory() {
  const [memories, setMemories] = useState<Memory[]>(INITIAL_MEMORIES);
  const [collections] = useState<Collection[]>(INITIAL_COLLECTIONS);
  const [selectedCollection, setSelectedCollection] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "name">("recent");

  const getMemories = useCallback(() => {
    let filtered = [...memories];

    if (selectedCollection === "favorites") {
      filtered = filtered.filter((m) => m.isFavorite);
    } else if (selectedCollection !== "all") {
      filtered = filtered.filter((m) => m.collectionId === selectedCollection);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          m.description?.toLowerCase().includes(query),
      );
    }

    filtered.sort((a, b) => {
      if (sortBy === "recent") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return a.title.localeCompare(b.title);
    });

    return filtered;
  }, [memories, selectedCollection, searchQuery, sortBy]);

  const getMemory = useCallback(
    (id: string) => {
      return memories.find((m) => m.id === id) || null;
    },
    [memories],
  );

  const createMemory = useCallback((data: CreateMemory) => {
    const now = new Date().toISOString();
    const newMemory: Memory = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    setMemories((prev) => [newMemory, ...prev]);
    return newMemory;
  }, []);

  const updateMemory = useCallback((id: string, data: UpdateMemory) => {
    setMemories((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, ...data, updatedAt: new Date().toISOString() } : m,
      ),
    );
  }, []);

  const deleteMemory = useCallback((id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setMemories((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isFavorite: !m.isFavorite } : m)),
    );
  }, []);

  const filteredMemories = useMemo(() => getMemories(), [getMemories]);

  const totalByCollection = useMemo(() => {
    const counts: Record<string, number> = { all: memories.length, favorites: 0 };
    memories.forEach((m) => {
      if (m.isFavorite) counts.favorites = (counts.favorites || 0) + 1;
      if (m.collectionId) {
        counts[m.collectionId] = (counts[m.collectionId] || 0) + 1;
      }
    });
    return counts;
  }, [memories]);

  return {
    memories: filteredMemories,
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
  };
}
