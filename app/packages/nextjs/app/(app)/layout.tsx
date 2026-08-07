"use client";

import { SharedAppHeader } from "~~/components/shared/SharedAppHeader";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SharedAppHeader />
      <main className="">{children}</main>
    </div>
  );
}
