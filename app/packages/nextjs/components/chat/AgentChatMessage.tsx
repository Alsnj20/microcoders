"use client";

export interface MessageProps {
  id: string;
  role: "user" | "assistant";
  avatarUrl: string;
  content: string;
  systemLog?: string;
}

export function AgentChatMessage({ role, avatarUrl, content, systemLog }: MessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex items-start gap-4 max-w-3xl ${isUser ? "self-end flex-row-reverse" : "self-start"}`}>
      <img
        className="size-10 rounded-full border border-border shrink-0 object-cover"
        alt={isUser ? "User Avatar" : "Agent Avatar"}
        src={avatarUrl}
      />
      <div
        className={`p-4 rounded-3xl ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted text-foreground rounded-tl-sm border border-input"
        }`}
      >
        <p className="font-['Hanken_Grotesk'] text-base leading-relaxed">{content}</p>

        {systemLog && (
          <div className="mt-3 bg-input rounded-xl p-3 border border-border font-mono text-xs text-muted-foreground">
            {systemLog}
          </div>
        )}
      </div>
    </div>
  );
}
