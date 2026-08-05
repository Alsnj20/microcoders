"use client";

import { useRouter } from "next/navigation";

export const BackButton = () => {
  const router = useRouter();
  return (
    <button type="button" className="inline-flex items-center justify-center rounded-lg font-medium transition-colors h-8 px-3 text-xs bg-primary text-primary-foreground" onClick={() => router.back()}>
      Back
    </button>
  );
};
