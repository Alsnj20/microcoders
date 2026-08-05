"use client";

export function AgentChatSidebar() {
  return (
    <nav className="fixed left-0 top-0 h-screen w-70 bg-muted border-r border-border shadow-lg shadow-foreground/5 flex flex-col py-6 z-50">
      {/* User Info Header */}
      <div className="px-6 flex items-center gap-4 mb-6">
        <div className="relative">
          <img
            className="size-12 rounded-full object-cover border border-border"
            alt="CryptoEnthusiast Avatar"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCfwydSf4eT5deF0TsqX2HrkwueTomzy6nMFqGHTj_6_5F3Ch4c44uRurvTdYtJaCljYTnLKjNV6Ar4QtT3XNQlWUbzCZd7kdlsDNTKqM-hLMrk3_9KMWR4jiWkEORNFF7pwOsktnySVf8GGiMxGQFt4dWVVpO60yAIotruOAE-mIlCJjkh9YJq69R8BO_p7NV04mMUwrdiIHN2HB1_xUdpv4z3jPCIt-ZoUNj2KCTG1EncHAUEsY7Z"
          />
          <div className="absolute bottom-0 right-0 size-3 bg-primary rounded-full border-2 border-muted" />
        </div>
        <div>
          <h2 className="font-['Source_Serif_4'] text-lg font-bold text-foreground">CryptoEnthusiast</h2>
          <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded bg-warning/30 text-secondary font-['Hanken_Grotesk'] text-xs font-semibold">
            <span className="material-symbols-outlined text-xs mr-1">toll</span> 1,240 TOKENS
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-6 scrollbar-hide">
        {/* Chats Section */}
        <div>
          <h3 className="px-4 mb-2 font-['Hanken_Grotesk'] text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Chats
          </h3>
          <div className="space-y-1">
            <a
              href="/chat#solana"
              className="flex items-center gap-3 px-4 py-3 border-l-4 border-primary bg-input text-primary font-bold transition-all duration-200 rounded-r-lg"
            >
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                chat_bubble
              </span>
              <span className="font-['Hanken_Grotesk'] text-sm">Solana Analysis</span>
            </a>
            <a
              href="/chat#defi"
              className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-surface-container-low transition-colors border-l-4 border-transparent hover:border-border rounded-r-lg"
            >
              <span className="material-symbols-outlined text-xl">chat_bubble</span>
              <span className="font-['Hanken_Grotesk'] text-sm">Defi Yields</span>
            </a>
          </div>
        </div>

        {/* Agentes Section */}
        <div>
          <h3 className="px-4 mb-2 font-['Hanken_Grotesk'] text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Agentes
          </h3>
          <div className="space-y-1">
            <a
              href="/chat#trading-bot"
              className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-surface-container-low transition-colors border-l-4 border-transparent hover:border-border rounded-r-lg"
            >
              <span className="material-symbols-outlined text-xl">smart_toy</span>
              <span className="font-['Hanken_Grotesk'] text-sm">Trading Bot</span>
            </a>
            <a
              href="/chat#news-aggregator"
              className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-surface-container-low transition-colors border-l-4 border-transparent hover:border-border rounded-r-lg"
            >
              <span className="material-symbols-outlined text-xl">smart_toy</span>
              <span className="font-['Hanken_Grotesk'] text-sm">News Aggregator</span>
            </a>
          </div>
          <div className="px-4 mt-3 flex gap-2">
            <button
              type="button"
              className="flex-1 py-1.5 rounded-lg bg-input text-foreground font-['Hanken_Grotesk'] text-xs font-semibold hover:bg-surface-container-high transition-colors border border-border"
            >
              Add
            </button>
            <button
              type="button"
              className="flex-1 py-1.5 rounded-lg bg-input text-foreground font-['Hanken_Grotesk'] text-xs font-semibold hover:bg-surface-container-high transition-colors border border-border"
            >
              Ver más
            </button>
          </div>
        </div>

        {/* Memoria Section */}
        <div>
          <h3 className="px-4 mb-2 font-['Hanken_Grotesk'] text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Memoria
          </h3>
          <a
            href="/chat#knowledge"
            className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-surface-container-low transition-colors border-l-4 border-transparent hover:border-border rounded-r-lg"
          >
            <span className="material-symbols-outlined text-xl">psychology</span>
            <span className="font-['Hanken_Grotesk'] text-sm">Knowledge Base</span>
          </a>
        </div>
      </div>

      {/* Footer / Connect Button */}
      <div className="px-4 mt-auto">
        <button
          type="button"
          className="w-full py-3 rounded-full bg-secondary text-secondary-foreground font-['Hanken_Grotesk'] text-sm font-semibold hover:bg-secondary/90 transition-all shadow-sm"
        >
          Connect Wallet
        </button>
      </div>
    </nav>
  );
}
