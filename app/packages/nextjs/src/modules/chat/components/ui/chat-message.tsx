"use client";

import type { ChatMessage as ChatMessageType } from "../../types/chat";

export function ChatMessage({
  role,
  avatarUrl,
  content,
  systemLog,
  memoryCid,
  creditsUsed,
  timestamp,
}: ChatMessageType) {
  const isAssistant = role === "assistant";

  return (
    <div
      className={`flex gap-4 w-full max-w-4xl p-5 rounded-2xl transition-all duration-200 ${
        isAssistant
          ? "bg-card border border-border/60 shadow-sm"
          : "bg-muted/40 border border-border/30 ml-auto"
      }`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <img
          src={avatarUrl}
          alt={`${role} avatar`}
          className="w-10 h-10 rounded-xl object-cover border border-border/60 shadow-sm"
        />
        {isAssistant && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center text-[10px] text-primary-foreground font-bold">
            ✓
          </div>
        )}
      </div>

      {/* Content Body */}
      <div className="flex-1 space-y-3">
        {/* Header Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-bold text-foreground">
            {isAssistant ? "MemoryChain Agent" : "Tú (Usuario)"}
          </span>
          {timestamp && <span>{timestamp}</span>}
        </div>

        {/* Text Content */}
        <p className="text-sm md:text-base leading-relaxed text-foreground whitespace-pre-wrap font-sans">
          {content}
        </p>

        {/* System Logs & Memory Metadata */}
        {isAssistant && (systemLog || memoryCid || creditsUsed !== undefined) && (
          <div className="mt-4 pt-3 border-t border-border/40 space-y-2 font-mono text-xs">
            {systemLog && (
              <div className="p-3 rounded-xl bg-muted/60 text-muted-foreground border border-border/30 overflow-x-auto">
                <span className="text-primary font-bold">{systemLog}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-3 items-center text-muted-foreground text-[11px]">
              {memoryCid && (
                <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold">
                  <span className="material-symbols-outlined text-sm">lock</span>
                  {memoryCid}
                </span>
              )}
              {creditsUsed !== undefined && creditsUsed > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-500 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-md">
                  <span className="material-symbols-outlined text-sm">credit_card</span>
                  -{creditsUsed} MC
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
