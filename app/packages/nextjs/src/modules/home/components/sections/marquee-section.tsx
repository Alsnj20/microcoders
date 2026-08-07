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
    <div className="w-full bg-primary/5 border-y border-primary/10 py-5 overflow-hidden select-none">
      {/* Duplicate items so the seamless loop works: scroll first half, then restart invisibly */}
      <div className="flex w-max animate-marquee gap-0">
        {[...marqueeItems, ...marqueeItems].map((item, idx) => (
          <div
            key={`${item}-${idx}`}
            className="flex items-center gap-4 px-8"
          >
            <span className="material-symbols-outlined text-primary text-sm leading-none">auto_awesome</span>
            <span className="text-sm font-semibold tracking-wider text-foreground uppercase font-mono whitespace-nowrap">
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
