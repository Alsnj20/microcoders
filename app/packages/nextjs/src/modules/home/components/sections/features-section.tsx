"use client";

const features = [
  {
    icon: "shield",
    title: "Tú controlas",
    description: "Tus datos, tus claves, tus reglas.",
  },
  {
    icon: "link_2",
    title: "Descentralizado",
    description: "Almacenamiento distribuido en la blockchain.",
  },
  {
    icon: "hub",
    title: "Interoperable",
    description: "Conecta memorias, agentes y contextos.",
  },
  {
    icon: "lock",
    title: "Privado por diseño",
    description: "Privacidad, encriptación y propiedad verificable.",
  },
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 border-y border-border/40">
      <div className="px-6 md:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-2xl bg-card border border-border/60 hover:border-primary/40 transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-2xl">{feature.icon}</span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
