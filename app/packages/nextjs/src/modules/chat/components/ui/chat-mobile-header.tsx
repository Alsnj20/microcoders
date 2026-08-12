"use client";

interface ChatMobileHeaderProps {
  onOpenLeft: () => void;
  onOpenRight: () => void;
  onCreateConversation: () => void;
  agentName?: string;
}

export function ChatMobileHeader({ onOpenLeft, onOpenRight, onCreateConversation, agentName }: ChatMobileHeaderProps) {
  return (
    <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background shrink-0">
      {/* Left: Open conversations sidebar */}
      <div className="flex gap-2">
      <button
        type="button"
        onClick={onOpenLeft}
        className="p-2 px-8 rounded-lg bg-muted hover:bg-muted/70 transition-colors"
        title="Conversaciones"
      >
        <span className="text-md font-medium text-foreground truncate max-w-45">CHATS</span>
      </button>
      <button
        type="button"
        onClick={onCreateConversation}
        className="w-10 h-10 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
        title="Nueva conversación"
      >
        <span className="material-symbols-outlined text-lg text-primary">add</span>
      </button>
      </div>

      {/* Center: New conversation + Agent name */}
      <div className="flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="text-sm font-medium text-foreground truncate max-w-45">{agentName || "MemoryChain"}</span>
      </div>

      {/* Right: Open context panel */}
      <button
        type="button"
        onClick={onOpenRight}
        className="p-2 rounded-lg bg-muted hover:bg-muted/70 transition-colors"
        title="Contexto"
      >
        <span className="text-md font-medium text-foreground truncate max-w-45">CONTEXTO</span>
      </button>
    </div>
  );
}
