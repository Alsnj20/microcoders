"use client";

import { useState } from "react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSendMessage(input);
    setInput("");
  };

  return (
    <div className="fixed bottom-0 left-0 lg:left-70 right-0 bg-background/95 border-t border-border/80 p-4 backdrop-blur-md flex justify-center z-30">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-4xl bg-card rounded-3xl border border-border p-2 flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-200"
      >
        <button
          type="button"
          aria-label="Attach File"
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors shrink-0"
        >
          <span className="material-symbols-outlined text-xl">attach_file</span>
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask MemoryChain agent or request analysis..."
          disabled={disabled}
          className="flex-1 bg-transparent border-none outline-none font-sans text-base text-foreground placeholder-outline px-2"
        />

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground font-sans">
          <span className="size-2 rounded-full bg-primary" />
          <span>Agent-v1.4</span>
        </div>

        <button
          type="submit"
          disabled={!input.trim() || disabled}
          aria-label="Send Message"
          className="p-2.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center shrink-0"
        >
          <span className="material-symbols-outlined text-xl">arrow_upward</span>
        </button>
      </form>
    </div>
  );
}
