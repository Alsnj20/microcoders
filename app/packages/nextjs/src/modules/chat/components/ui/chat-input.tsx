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
    <div className="fixed bottom-0 left-0 lg:left-72 right-0 bg-gradient-to-t from-background via-background/95 to-transparent pt-6 pb-6 px-4 md:px-8 z-30">
      <form
        onSubmit={handleSubmit}
        className="max-w-4xl mx-auto bg-card border border-border/80 rounded-2xl shadow-2xl p-2.5 flex items-center gap-3 backdrop-blur-xl hover:border-primary/50 transition-all duration-200"
      >
        <button
          type="button"
          aria-label="Attach Memory File"
          className="p-2.5 text-muted-foreground hover:text-primary hover:bg-muted/60 rounded-xl transition-colors shrink-0"
        >
          <span className="material-symbols-outlined text-xl">attach_file</span>
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregunta a tu agente MemoryChain o solicita análisis..."
          disabled={disabled}
          className="flex-1 bg-transparent border-none outline-none text-sm md:text-base text-foreground placeholder:text-muted-foreground px-2 font-sans"
        />

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xl text-xs font-mono text-primary font-semibold shrink-0">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>Stylus Agent</span>
        </div>

        <button
          type="submit"
          disabled={!input.trim() || disabled}
          aria-label="Send Message"
          className="p-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 shrink-0 flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-xl">arrow_upward</span>
        </button>
      </form>
    </div>
  );
}
