"use client";

import { PetWalkSection } from "~~/src/modules/pet";
import { AboutSection } from "../sections/about-section";
import { CtaSection } from "../sections/cta-section";
import { FaqSection } from "../sections/faq-section";
import { FeaturesSection } from "../sections/features-section";
import { FooterSection } from "../sections/footer-section";
import { HeroSection } from "../sections/hero-section";
import { HowItWorksSection } from "../sections/how-it-works-section";
import { PricingSection } from "../sections/pricing-section";
import { SocialProofSection } from "../sections/social-proof-section";
import { UseCasesSection } from "../sections/use-cases-section";
import { Header } from "../ui/header";

export const HomePage = () => {
  return (
    <div className="min-w-dvw min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1">
        <HeroSection />
        <AboutSection />
        <HowItWorksSection />
        <UseCasesSection />
        <FeaturesSection />
        <PetWalkSection />
        <PricingSection />
        <SocialProofSection />
        <FaqSection />
        <CtaSection />
      </main>

      <FooterSection />
    </div>
  );
};
