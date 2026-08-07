"use client";

import { PetWalkSection } from "~~/src/modules/pet";
import { ClientsSection } from "../sections/clients-section";
import { ExploreLinksSection } from "../sections/explore-links-section";
import { FeaturesSection } from "../sections/features-section";
import { FooterSection } from "../sections/footer-section";
import { HeroSection } from "../sections/hero-section";
import { Header } from "../ui/header";

export const HomePage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Header Navigation */}
      <Header />

      {/* Main Sections */}
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <ClientsSection />
        <ExploreLinksSection />
        <PetWalkSection />
      </main>

      {/* Footer */}
      <FooterSection />
    </div>
  );
};
