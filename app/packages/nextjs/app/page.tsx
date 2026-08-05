"use client";

import type { NextPage } from "next";
import { useAccount } from "wagmi";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  return (
    <div className="min-h-screen font-['Hanken_Grotesk'] bg-background text-foreground">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-background/90 backdrop-blur-md border-b border-border/30">
        <div className="flex justify-between items-center h-20 px-5 md:px-16 max-w-[1280px] mx-auto">
          <div className="font-['Source_Serif_4'] text-xl font-medium tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-3xl text-primary">eco</span>
            <span className="text-primary">AgentOS</span>
          </div>

          <div className="hidden md:flex space-x-8 items-center">
            <a href="#" className="text-sm font-semibold text-primary border-b-2 border-primary pb-1">
              Protocol
            </a>
            <a href="#features" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Features
            </a>
            <a href="#ecosystem" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Ecosystem
            </a>
            <a href="#docs" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Docs
            </a>
          </div>

          <a
            href="/chat"
            className="bg-primary text-primary-foreground text-sm font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-all duration-200 shadow-sm active:scale-95 hidden md:block"
          >
            Launch App
          </a>

          <button type="button" className="md:hidden text-primary">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="px-5 md:px-16 py-16 md:py-[120px] max-w-[1280px] mx-auto text-center flex flex-col items-center justify-center min-h-[716px]">
          <h1 className="font-['Source_Serif_4'] text-4xl md:text-[48px] font-semibold leading-tight tracking-tight text-primary mb-6 max-w-4xl mx-auto">
            Sovereign Intelligence.
            <br />
            Your knowledge, finally yours.
          </h1>
          <p className="text-lg md:text-[18px] leading-relaxed text-muted-foreground max-w-2xl mx-auto mb-8">
            AgentOS is the decentralized protocol that separates memory from platforms, giving you
            complete ownership of your personal AI knowledge base.
          </p>

          <div className="flex gap-4 justify-center w-full md:w-auto">
            <a
              href="/chat"
              className="bg-primary text-primary-foreground text-sm font-semibold px-8 py-4 rounded-lg hover:opacity-90 transition-all duration-200 active:scale-95 w-full md:w-auto text-center"
            >
              Start Building
            </a>
            <button
              type="button"
              className="bg-card text-primary text-sm font-semibold px-8 py-4 rounded-lg border border-border hover:border-primary/50 transition-all duration-200 active:scale-95 w-full md:w-auto"
            >
              Read Whitepaper
            </button>
          </div>

          {/* Hero Visual */}
          <div className="mt-16 w-full max-w-4xl rounded-xl overflow-hidden border border-border h-64 md:h-96 relative bg-muted">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10" />
            <div className="relative z-10 w-full h-full flex items-center justify-center backdrop-blur-sm bg-white/50 border border-border/30 rounded-lg">
              <div className="text-center">
                <span className="material-symbols-outlined text-6xl text-primary mb-4">hub</span>
                <p className="font-['Source_Serif_4'] text-lg text-muted-foreground">
                  Decentralized AI Agent Network
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section className="bg-muted">
          <div className="py-16 md:py-[120px]">
            <div className="px-5 md:px-16 max-w-[1280px] mx-auto">
              <div className="text-center mb-12">
                <span className="inline-block bg-primary/20 text-primary text-xs font-medium px-3 py-1 rounded-full mb-4">
                  The Problem
                </span>
                <h2 className="font-['Source_Serif_4'] text-2xl md:text-[32px] font-semibold leading-tight text-primary max-w-2xl mx-auto">
                  The Knowledge Paradox.
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="col-span-1 md:col-span-8 bg-card p-6 rounded-xl border border-border">
                  <div className="w-12 h-12 bg-destructive/10 text-destructive rounded-lg flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined">lock</span>
                  </div>
                  <h3 className="font-['Source_Serif_4'] text-2xl font-medium text-primary mb-3">
                    Locked in Silos
                  </h3>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    Your AI assistants know everything about you, but you own nothing of what they
                    learn. Knowledge is fragmented across platforms you don&apos;t control.
                  </p>
                </div>

                <div className="col-span-1 md:col-span-4 bg-card p-6 rounded-xl border border-border">
                  <div className="w-12 h-12 bg-input text-foreground rounded-lg flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined">warning</span>
                  </div>
                  <h3 className="font-['Source_Serif_4'] text-2xl font-medium text-primary mb-3">
                    Unverifiable
                  </h3>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    Changes to your data happen in a black box. There is no cryptographic proof of
                    origin or integrity.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Solution Section */}
        <section className="px-5 md:px-16 py-16 md:py-[120px] max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block bg-primary/20 text-primary text-xs font-medium px-3 py-1 rounded-full mb-4">
                The Solution
              </span>
              <h2 className="font-['Source_Serif_4'] text-2xl md:text-[32px] font-semibold leading-tight text-primary mb-4">
                The AgentOS Protocol.
              </h2>
              <p className="text-lg leading-relaxed text-muted-foreground mb-6">
                Interoperable, Verifiable, and Private. Own your knowledge, own your agents, and own
                the relationships between them. Built on Arbitrum Stylus for cryptographic trust.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="material-symbols-outlined text-primary mr-3 mt-0.5">
                    check_circle
                  </span>
                  <span className="text-base text-muted-foreground">
                    True ownership of personal AI models.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="material-symbols-outlined text-primary mr-3 mt-0.5">
                    check_circle
                  </span>
                  <span className="text-base text-muted-foreground">
                    Seamless transfer between ecosystems.
                  </span>
                </li>
              </ul>
            </div>

            <div className="relative h-96 rounded-xl border border-border bg-input overflow-hidden p-4">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10" />
              <div className="relative z-10 w-full h-full rounded-lg flex items-center justify-center backdrop-blur-sm bg-white/50 border border-border/30">
                <span className="material-symbols-outlined text-secondary text-6xl">hub</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="bg-muted">
          <div className="py-16 md:py-[120px]">
            <div className="px-5 md:px-16 max-w-[1280px] mx-auto">
              <div className="text-center mb-12">
                <h2 className="font-['Source_Serif_4'] text-2xl md:text-[32px] font-semibold leading-tight text-primary">
                  Built for Sovereign Intelligence
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    icon: "memory",
                    title: "Persistent Memory",
                    description:
                      "Your AI agents remember context across sessions, building a living knowledge graph that evolves with you.",
                  },
                  {
                    icon: "verified_user",
                    title: "Cryptographic Trust",
                    description:
                      "Every interaction is verifiable on-chain. Zero-knowledge proofs ensure privacy without sacrificing transparency.",
                  },
                  {
                    icon: "swap_horiz",
                    title: "Cross-Chain Portability",
                    description:
                      "Take your agents and knowledge anywhere. Full interoperability across L2 ecosystems via Arbitrum Stylus.",
                  },
                ].map(feature => (
                  <div
                    key={feature.title}
                    className="bg-card p-6 rounded-xl border border-border transition-all duration-200 hover:shadow-lg hover:border-primary/50"
                  >
                    <div className="w-12 h-12 bg-primary/20 text-primary rounded-lg flex items-center justify-center mb-4">
                      <span className="material-symbols-outlined">{feature.icon}</span>
                    </div>
                    <h3 className="font-['Source_Serif_4'] text-xl font-medium text-primary mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-5 md:px-16 py-16 md:py-[120px] max-w-[1280px] mx-auto text-center">
          <h2 className="font-['Source_Serif_4'] text-3xl md:text-[40px] font-semibold leading-tight text-primary mb-6 max-w-3xl mx-auto">
            Ready to own your intelligence?
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Join the network of builders creating the next generation of autonomous AI agents.
          </p>
          <a
            href="/chat"
            className="inline-block bg-primary text-primary-foreground text-sm font-semibold px-8 py-4 rounded-lg hover:opacity-90 transition-all duration-200 active:scale-95"
          >
            Launch AgentOS
          </a>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-16 bg-muted border-t border-border/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-5 md:px-16 max-w-[1280px] mx-auto opacity-100 hover:opacity-80 transition-opacity">
          <div>
            <div className="font-['Source_Serif_4'] text-xl font-medium tracking-tight text-primary mb-3">
              AgentOS
            </div>
            <p className="text-base text-muted-foreground">
              &copy; {new Date().getFullYear()} AgentOS Protocol. Built for the era of sovereign
              intelligence.
            </p>
          </div>
          <div className="flex flex-wrap gap-6 md:justify-end text-base text-muted-foreground">
            <a href="#" className="hover:text-secondary transition-colors">
              Whitepaper
            </a>
            <a href="#" className="hover:text-secondary transition-colors">
              Github
            </a>
            <a href="#" className="hover:text-secondary transition-colors">
              Governance
            </a>
            <a href="#" className="hover:text-secondary transition-colors">
              Privacy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
