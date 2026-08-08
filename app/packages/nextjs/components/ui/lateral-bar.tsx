"use client";

import type { ReactNode } from "react";

// ============================================================
// LateralBar - Sistema unificado de barras laterales
// ============================================================

interface LateralBarProps {
  children: ReactNode;
  className?: string;
  width?: "sm" | "md" | "lg" | "xl";
}

const widthMap = {
  sm: "w-64",
  md: "w-70",
  lg: "w-72",
  xl: "w-80",
};

export function LateralBar({ children, className = "", width = "md" }: LateralBarProps) {
  return (
    <aside
      className={`hidden lg:flex flex-col h-full ${widthMap[width]} bg-muted border-r border-border shrink-0 ${className}`}
    >
      {children}
    </aside>
  );
}

// ============================================================
// LateralBarHeader - Header con información de usuario/icono
// ============================================================

interface LateralBarHeaderProps {
  children: ReactNode;
  className?: string;
}

export function LateralBarHeader({ children, className = "" }: LateralBarHeaderProps) {
  return <div className={`px-6 py-6 border-b border-border/40 ${className}`}>{children}</div>;
}

// ============================================================
// LateralBarFooter - Footer con botones o contenido fijo
// ============================================================

interface LateralBarFooterProps {
  children: ReactNode;
  className?: string;
}

export function LateralBarFooter({ children, className = "" }: LateralBarFooterProps) {
  return <div className={`px-4 mt-auto py-4 ${className}`}>{children}</div>;
}

// ============================================================
// LateralBarSection - Sección con título
// ============================================================

interface LateralBarSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function LateralBarSection({ title, children, className = "" }: LateralBarSectionProps) {
  return (
    <div className={`px-2 space-y-1 ${className}`}>
      <h3 className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

// ============================================================
// LateralBarSectionButton - Botón clickeable dentro de sección
// ============================================================

interface LateralBarSectionButtonProps {
  children: ReactNode;
  onClick?: () => void;
  isActive?: boolean;
  icon?: string;
  className?: string;
}

export function LateralBarSectionButton({
  children,
  onClick,
  isActive = false,
  icon,
  className = "",
}: LateralBarSectionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-r-lg text-left transition-all duration-200 overflow-hidden ${
        isActive
          ? "border-l-4 border-primary bg-input text-primary font-bold"
          : "border-l-4 border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-container-low hover:border-border"
      } ${className}`}
    >
      {icon && (
        <span
          className="material-symbols-outlined text-xl"
          style={{ fontVariationSettings: isActive ? "'FILL' 1" : undefined }}
        >
          {icon}
        </span>
      )}
      <span className="text-sm">{children}</span>
    </button>
  );
}

// ============================================================
// LateralBarSectionLink - Link clickeable dentro de sección
// ============================================================

interface LateralBarSectionLinkProps {
  children: ReactNode;
  href: string;
  isActive?: boolean;
  icon?: string;
  className?: string;
}

export function LateralBarSectionLink({
  children,
  href,
  isActive = false,
  icon,
  className = "",
}: LateralBarSectionLinkProps) {
  return (
    <a
      href={href}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-r-lg text-left transition-all duration-200 ${
        isActive
          ? "border-l-4 border-primary bg-input text-primary font-bold"
          : "border-l-4 border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-container-low hover:border-border"
      } ${className}`}
    >
      {icon && (
        <span
          className="material-symbols-outlined text-xl"
          style={{ fontVariationSettings: isActive ? "'FILL' 1" : undefined }}
        >
          {icon}
        </span>
      )}
      <span className="text-sm">{children}</span>
    </a>
  );
}

// ============================================================
// LateralBarContent - Contenedor scrollable de contenido
// ============================================================

interface LateralBarContentProps {
  children: ReactNode;
  className?: string;
}

export function LateralBarContent({ children, className = "" }: LateralBarContentProps) {
  return <div className={`flex-1 overflow-y-auto overflow-x-hidden px-2 py-6 space-y-6 scrollbar-hide ${className}`}>{children}</div>;
}
