"use client";

export function AgentChatHeader() {
  return (
    <header className="sticky top-0 z-40 bg-background/90 border-b border-border backdrop-blur-md flex justify-between items-center w-full px-6 h-16">
      <div className="font-['Source_Serif_4'] text-xl font-medium tracking-tight text-foreground flex items-center gap-2">
        <span className="material-symbols-outlined text-3xl text-primary">eco</span>
        <span>AgentOS</span>
      </div>

      {/* Contextual Navigation */}
      <div className="hidden md:flex items-center gap-4">
        <div className="flex space-x-6">
          <a
            href="/chat"
            className="text-primary font-bold border-b-2 border-primary pb-1 font-['Hanken_Grotesk'] text-sm"
          >
            Chats
          </a>
          <a
            href="/chat#agentes"
            className="text-muted-foreground hover:text-foreground font-['Hanken_Grotesk'] text-sm transition-colors"
          >
            Agentes
          </a>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="size-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
        >
          <span className="material-symbols-outlined text-xl">notifications</span>
        </button>
        <button
          type="button"
          aria-label="View Grid"
          className="size-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
        >
          <span className="material-symbols-outlined text-xl">grid_view</span>
        </button>
        <button
          type="button"
          className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-['Hanken_Grotesk'] text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
        >
          New Chat
        </button>
      </div>
    </header>
  );
}
