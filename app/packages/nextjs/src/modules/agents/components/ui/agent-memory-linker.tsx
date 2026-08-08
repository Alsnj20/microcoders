"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~~/components/ui/dialog";
import { Button } from "~~/components/ui/button";
import { api } from "~~/services/api/client";

interface MemoryItem {
  memoryId: string;
  name: string;
  cid: string;
  memoryType: number;
}

interface AgentMemoryLinkerProps {
  agentId: string;
  onLink: (agentId: string, memoryId: string) => void;
  onUnlink: (agentId: string, memoryId: string) => void;
  onClose: () => void;
}

export function AgentMemoryLinker({
  agentId,
  onLink,
  onUnlink,
  onClose,
}: AgentMemoryLinkerProps) {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [memRes, ctxRes] = await Promise.all([
          api.memories.$get(),
          api.context.agent[agentId].memories.$get(),
        ]);

        if (memRes.ok) {
          const memData = await memRes.json();
          setMemories(memData.memories || []);
        }

        if (ctxRes.ok) {
          const ctxData = await ctxRes.json();
          const ids = new Set((ctxData.links || []).map((l: any) => l.memoryId));
          setLinkedIds(ids);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [agentId]);

  const handleToggle = (memoryId: string) => {
    if (linkedIds.has(memoryId)) {
      onUnlink(agentId, memoryId);
      setLinkedIds((prev) => {
        const next = new Set(prev);
        next.delete(memoryId);
        return next;
      });
    } else {
      onLink(agentId, memoryId);
      setLinkedIds((prev) => new Set(prev).add(memoryId));
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular Memorias</DialogTitle>
          <DialogDescription>Conecta memorias al agente para darle conocimiento.</DialogDescription>
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
            memories.map((mem) => {
              const isLinked = linkedIds.has(mem.memoryId);
              return (
                <div
                  key={mem.memoryId}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    isLinked ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-sm text-primary">
                      {mem.memoryType === 0 ? "description" : mem.memoryType === 1 ? "code" : "science"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{mem.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{mem.cid}</p>
                  </div>
                  <Button
                    variant={isLinked ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggle(mem.memoryId)}
                  >
                    {isLinked ? "Vinculada" : "Vincular"}
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
