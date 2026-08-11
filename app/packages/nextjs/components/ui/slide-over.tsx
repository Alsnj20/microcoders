"use client";

import { type ReactNode, useEffect, useRef } from "react";

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  side: "left" | "right";
  title: string;
  children: ReactNode;
  width?: string;
}

export function SlideOver({ open, onClose, side, title, children, width = "w-80" }: SlideOverProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const translateClass = side === "left" ? "-translate-x-full" : "translate-x-full";
  const positionClass = side === "left" ? "left-0" : "right-0";
  const borderClass = side === "left" ? "border-r" : "border-l";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        onClick={onClose}
        onKeyDown={e => e.key === "Enter" && onClose()}
        role="button"
        tabIndex={-1}
        aria-label="Close panel"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 ${side === "left" ? "left-0" : "right-0"} h-full ${width} ${borderClass} border-border bg-muted shadow-xl z-50 flex flex-col transition-transform duration-300 ease-out lg:hidden ${
          open ? "translate-x-0" : translateClass
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:text-muted-foreground transition-colors">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">{children}</div>
      </div>
    </>
  );
}
