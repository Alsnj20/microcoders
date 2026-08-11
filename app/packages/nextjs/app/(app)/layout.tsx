"use client";

import { SharedAppHeader } from "~~/components/shared/SharedAppHeader";
import { ErrorBoundary } from "~~/components/shared/ErrorBoundary";
import { AuthGate } from "~~/src/modules/auth/components/AuthGate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-w-dvw min-h-screen bg-background text-foreground flex flex-col">
      <SharedAppHeader />
      <main className="pt-20 flex-1">
        <ErrorBoundary>
           <AuthGate>{children}</AuthGate>
        </ErrorBoundary>
      </main>
    </div>
  );
}
