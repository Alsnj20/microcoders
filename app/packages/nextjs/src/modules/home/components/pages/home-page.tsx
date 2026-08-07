"use client";

import { Header } from "../ui/header";
import { HeroSection } from "../sections/hero-section";
import { AboutJp3dSection } from "../sections/about-jp3d-section";
import { MarqueeSection } from "../sections/marquee-section";
import { ProjectsSection } from "../sections/projects-section";
import { ServicesSection } from "../sections/services-section";
import { ClientsSection } from "../sections/clients-section";
import { VideosSection } from "../sections/videos-section";
import { ExploreLinksSection } from "../sections/explore-links-section";
import { FooterSection } from "../sections/footer-section";

export const HomePage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Header Navigation */}
      <Header />

      {/* Main Sections */}
      <main className="flex-1">
        <HeroSection />
        <MarqueeSection />
        <AboutJp3dSection />
        <VideosSection />
        <ProjectsSection />
        <ServicesSection />
        <ClientsSection />
        <ExploreLinksSection />
      </main>

      {/* Footer */}
      <FooterSection />
    </div>
  );
};
