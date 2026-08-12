"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CreditsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/profile");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-5rem)]">
      <p className="text-sm text-muted-foreground">Redirigiendo a perfil...</p>
    </div>
  );
}
