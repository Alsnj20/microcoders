"use client";

export const MarqueeSection = () => {
  const marqueeItems = [
    "Arbitrum Stylus (Rust)",
    "SHA-256 Cryptographic Verification",
    "Encrypted IPFS Storage",
    "PostgreSQL + pgvector Embeddings",
    "N:M Context Registry",
    "Memory Credits (MC) Engine",
    "OpenAI & Claude Compatible",
    "Zero-Knowledge Ready Architecture",
  ];

  return (
    <div className="w-full bg-primary/5 border-y border-primary/10 py-6 overflow-hidden select-none">
      <div className="flex w-max animate-marquee space-x-8">
        {[...marqueeItems, ...marqueeItems].map((item, idx) => (
          <div key={`${item}-${idx}`} className="flex items-center space-x-4">
            <span className="material-symbols-outlined text-primary text-sm">auto_awesome</span>
            <span className="text-sm font-semibold tracking-wider text-foreground uppercase font-mono">
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
