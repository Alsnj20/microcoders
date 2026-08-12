"use client";

import { User } from "lucide-react";
import { type ReactNode, useState } from "react";
import { SharedBotAvatar } from "../shared/SharedBotAvatar";
import { Markdown } from "../markdown";

// ============================================================
// ChatContainer - Contenedor principal del chat
// ============================================================

interface ChatContainerProps {
  children: ReactNode;
  className?: string;
}

export function ChatContainer({ children, className = "" }: ChatContainerProps) {
  return <div className={`flex-1 flex flex-col h-full bg-background ${className}`}>{children}</div>;
}

// ============================================================
// ChatMessages - Área scrollable de mensajes
// ============================================================

interface ChatMessagesProps {
  children: ReactNode;
  className?: string;
  empty?: boolean;
}

export function ChatMessages({ children, className = "", empty = false }: ChatMessagesProps) {
  return (
    <div
      className={`flex-1 overflow-y-auto p-6 scrollbar-hide ${empty ? "flex items-center justify-center" : ""} ${className}`}
    >
      <div className={`w-full max-w-4xl mx-auto ${empty ? "" : "flex flex-col gap-6 pt-4 pb-28"}`}>{children}</div>
    </div>
  );
}

// ============================================================
// ChatBubble - Burbuja de mensaje
// ============================================================

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  className?: string;
}

export function ChatBubble({ role, content, timestamp, className = "" }: ChatBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} ${className}`}>
      {isUser ? (
        <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-muted-foreground" />
        </div>
      ) : (
        <SharedBotAvatar size="md" />
      )}

      <div
        className={`max-w-[70%] px-4 py-3 rounded-2xl ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground border border-border rounded-bl-md"
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap font-sans">{content}</p>
        ) : (
          <Markdown>{content}</Markdown>
        )}
        {timestamp && (
          <p className={`text-xs mt-1 ${isUser ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
            {timestamp}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ChatInput - Input de mensajes
// ============================================================

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  children?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ChatInput({
  onSendMessage,
  children,
  placeholder = "Escribe tu mensaje...",
  disabled = false,
  className = "",
}: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSendMessage(input);
    setInput("");
  };

  return (
    <div className={`border-t border-border/40 bg-background/95 backdrop-blur-sm p-4 ${className}`}>
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 w-full max-w-4xl mx-auto bg-card rounded-3xl border border-border p-2 shadow-md hover:shadow-lg transition-all duration-200"
      >
        {children}
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent border-none outline-none font-sans text-base text-foreground placeholder:text-muted-foreground px-2"
        />
        <ChatSubmitButton disabled={!input.trim() || disabled} />
      </form>
    </div>
  );
}

// ============================================================
// ChatSubmitButton - Botón de envío
// ============================================================

interface ChatSubmitButtonProps {
  disabled?: boolean;
  className?: string;
}

export function ChatSubmitButton({ disabled = false, className = "" }: ChatSubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled}
      aria-label="Enviar mensaje"
      className={`p-2.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center shrink-0 ${className}`}
    >
      <span className="material-symbols-outlined text-xl">arrow_upward</span>
    </button>
  );
}

// ============================================================
// ChatAttachButton - Botón de adjuntar archivo
// ============================================================

interface ChatAttachButtonProps {
  onClick?: () => void;
  className?: string;
}

export function ChatAttachButton({ onClick, className = "" }: ChatAttachButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Adjuntar archivo"
      className={`p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors shrink-0 ${className}`}
    >
      <span className="material-symbols-outlined text-xl">attach_file</span>
    </button>
  );
}

// ============================================================
// ChatInsertMedia - Botón de insertar media/imagen
// ============================================================

interface ChatInsertMediaProps {
  onClick?: () => void;
  className?: string;
}

export function ChatInsertMedia({ onClick, className = "" }: ChatInsertMediaProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Insertar imagen"
      className={`p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors shrink-0 ${className}`}
    >
      <span className="material-symbols-outlined text-xl">image</span>
    </button>
  );
}

// ============================================================
// ChatEmptyState - Estado vacío del chat
// ============================================================

interface ChatEmptyStateProps {
  title?: string;
  description?: string;
  tools?: string[];
  className?: string;
}

export function ChatEmptyState({
  title = "¿Cómo puedo ayudarte hoy?",
  description,
  tools,
  className = "",
}: ChatEmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <div className="mb-4">
        <SharedBotAvatar size="lg" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-md">{description}</p>}
      {tools && tools.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-6 justify-center">
          {tools.map(tool => (
            <span key={tool} className="px-3 py-1.5 rounded-full bg-muted text-xs text-muted-foreground font-medium">
              {tool}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// ChatHelperText - Texto de ayuda debajo del input
// ============================================================

interface ChatHelperTextProps {
  children: ReactNode;
  className?: string;
}

export function ChatHelperText({ children, className = "" }: ChatHelperTextProps) {
  return <p className={`text-xs text-muted-foreground text-center mt-2 ${className}`}>{children}</p>;
}

// ============================================================
// ChatAgentBadge - Badge del agente en el input
// ============================================================

interface ChatAgentBadgeProps {
  agentName: string;
  className?: string;
}

export function ChatAgentBadge({ agentName, className = "" }: ChatAgentBadgeProps) {
  return (
    <div
      className={`hidden sm:flex items-center gap-1.5 px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground font-sans shrink-0 ${className}`}
    >
      <span className="size-2 rounded-full bg-primary" />
      <span>{agentName}</span>
    </div>
  );
}
