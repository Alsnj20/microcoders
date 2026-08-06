"use client";

import type React from "react";
import { useState } from "react";

interface AgentChatInputProps {
  onSendMessage?: (text: string) => void;
}

export function AgentChatInput({ onSendMessage }: AgentChatInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (onSendMessage) {
      onSendMessage(input);
    }
    setInput("");
  };

  return (
    <div className="fixed bottom-0 left-70 right-0 bg-background/95 border-t border-border p-4 backdrop-blur-md flex justify-center z-30">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-4xl bg-card rounded-3xl border border-border p-2 flex items-center gap-2 shadow-sm focus-within:border-primary transition-colors"
      >
        <button
          type="button"
          aria-label="Attach File"
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
        >
          <span className="material-symbols-outlined text-xl">attach_file</span>
        </button>

        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask MemoryChain agent or request analysis..."
          className="flex-1 bg-transparent border-none outline-none font-['Hanken_Grotesk'] text-base text-foreground placeholder-outline px-2"
        />

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-muted rounded-full text-xs font-['Hanken_Grotesk'] text-muted-foreground">
          <span className="size-2 rounded-full bg-primary" />
          <span>Agent-v1.4</span>
        </div>

        <button
          type="submit"
          disabled={!input.trim()}
          aria-label="Send Message"
          className="p-2.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-xl">arrow_upward</span>
        </button>
      </form>
    </div>
  );
}
