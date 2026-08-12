"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~~/components/ui/dialog";
import { Button } from "~~/components/ui/button";
import { api } from "~~/services/api/client";
import { useGlobalState } from "~~/services/store/store";
import { resolveMemoryTitleSafe } from "~~/src/modules/memories/services/memory-title";

interface MemoryItem {
  memoryId: string;
  name: string;
  cid: string;
  memoryType: number;
  status?: number;
}

interface MemorySelectorModalProps {
  linkedMemoryIds: string[];
  onLink: (memoryId: string) => void;
  onUnlink: (memoryId: string) => void;
  onClose: () => void;
}

export function MemorySelectorModal({
  linkedMemoryIds,
  onLink,
  onUnlink,
  onClose,
}: MemorySelectorModalProps) {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useGlobalState();

  useEffect(() => {
    let cancelled = false;
    const fetchMemories = async () => {
      setLoading(true);
      try {
        const res = await api.memories.$get();
        if (!cancelled && res.ok) {
          const data = await res.json();
          const items = data.memories || [];
          const resolved = await Promise.all(
            items.map(async (m: any) => ({
              memoryId: m.memoryId,
              name: await resolveMemoryTitleSafe(m.cid, session.kWallet, m.name),
              cid: m.cid,
              memoryType: m.memoryType,
              status: m.status,
            })),
          );
          if (!cancelled) setMemories(resolved);
        }
      } catch (err) {
        console.error("Failed to fetch memories:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchMemories();
    return () => { cancelled = true; };
  }, [session.kWallet]);

  const isLinked = (id: string) => linkedMemoryIds.includes(id);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar Memoria</DialogTitle>
          <DialogDescription>Vincula memorias existentes al contexto del chat.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-6">
              <span className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : memories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No hay memorias creadas. Crea una primero.
            </p>
          ) : (
            memories.filter(m => m.status !== 1).map((mem) => {
              const linked = isLinked(mem.memoryId);
              return (
                <div
                  key={mem.memoryId}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    linked ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-sm text-primary">
                      {mem.memoryType === 0 ? "description" : mem.memoryType === 1 ? "code" : "science"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{mem.name}</p>
                    {/*<p className="text-xs text-muted-foreground truncate">{mem.memoryType}</p>*/}
                  </div>
                  <Button
                    variant={linked ? "default" : "outline"}
                    size="sm"
                    onClick={() => (linked ? onUnlink(mem.memoryId) : onLink(mem.memoryId))}
                  >
                    {linked ? "Vinculada" : "Vincular"}
                  </Button>
                </div>
              );
            })
          )}
        </div>

        <Button className="w-full" onClick={onClose}>
          Listo
        </Button>
      </DialogContent>
    </Dialog>
  );
}
