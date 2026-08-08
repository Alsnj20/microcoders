"use client";

interface MemoryHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: "recent" | "oldest" | "name";
  onSortChange: (sort: "recent" | "oldest" | "name") => void;
  totalCount: number;
}

export function MemoryHeader({ searchQuery, onSearchChange, sortBy, onSortChange, totalCount }: MemoryHeaderProps) {
  return (
    <div>
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-2">Mis memorias</h1>
        <p className="text-muted-foreground">
          Almacena, organiza y gestiona tus memorias de forma descentralizada y privada.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            search
          </span>
          <input
            type="text"
            placeholder="Buscar memorias..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/60 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
        </div>
        <button
          type="button"
          className="px-4 py-2.5 rounded-xl border border-border/60 bg-card text-foreground text-sm font-medium flex items-center gap-2 hover:bg-muted/50 transition-all"
        >
          <span className="material-symbols-outlined text-lg">filter_list</span>
          Filtros
        </button>
        <select
          value={sortBy}
          onChange={e => onSortChange(e.target.value as typeof sortBy)}
          className="px-4 py-2.5 rounded-xl border border-border/60 bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="recent">Más recientes</option>
          <option value="oldest">Más antiguas</option>
          <option value="name">Nombre</option>
        </select>
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground mb-6">{totalCount} memorias</p>
    </div>
  );
}
