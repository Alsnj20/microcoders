"use client";

export const ServicesGrid = () => {
  const operations = [
    {
      action: "Crear Agente",
      cost: "5 MC",
      detail: "Generación e inicialización del blueprint en IPFS",
      icon: "add_circle",
    },
    {
      action: "Ejecutar Agente",
      cost: "2 MC",
      detail: "Procesamiento de inferencia LLM y contextualización",
      icon: "play_arrow",
    },
    {
      action: "Actualizar Agente",
      cost: "2 MC",
      detail: "Nueva versión del blueprint registrada on-chain",
      icon: "update",
    },
    {
      action: "Crear Memoria",
      cost: "1 MC",
      detail: "Cifrado fuera de cadena e inserción en pgvector",
      icon: "memory",
    },
    { action: "Actualizar Memoria", cost: "1 MC", detail: "Nuevo hash SHA-256 e incremento de versión", icon: "edit" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {operations.map(op => (
        <div
          key={op.action}
          className="bg-card p-6 rounded-2xl border border-border/60 hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined">{op.icon}</span>
              </div>
              <span className="text-sm font-bold px-3 py-1 bg-primary/20 text-primary rounded-full">{op.cost}</span>
            </div>
            <h4 className="text-lg font-bold text-foreground mb-2">{op.action}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{op.detail}</p>
          </div>

          <div className="mt-4 pt-4 border-t border-border/30 flex justify-between items-center text-xs text-muted-foreground">
            <span>Arbitrum Gas: Independiente</span>
            <span className="text-emerald-500 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              FastAPI
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
