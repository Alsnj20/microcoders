"use client";

import { type ReactNode, createContext, useContext } from "react";
import type { UsePetReturn } from "../types/pet";

const PetContext = createContext<UsePetReturn | null>(null);

interface PetProviderProps {
  children: ReactNode;
  pet: UsePetReturn;
}

export function PetProvider({ children, pet }: PetProviderProps) {
  return <PetContext.Provider value={pet}>{children}</PetContext.Provider>;
}

export function usePetContext(): UsePetReturn {
  const ctx = useContext(PetContext);
  if (!ctx) {
    throw new Error("usePetContext must be used within a PetProvider");
  }
  return ctx;
}
