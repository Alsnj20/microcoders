"use client";

import { SharedAppHeader } from "~~/components/shared/SharedAppHeader";
import { AuthGate } from "~~/src/modules/auth/components/AuthGate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SharedAppHeader />
      <main className="">
        <AuthGate>{children}</AuthGate>
      </main>
    </div>
  );
}
