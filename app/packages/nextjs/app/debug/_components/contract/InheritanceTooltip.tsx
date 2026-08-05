import { InformationCircleIcon } from "@heroicons/react/20/solid";

export const InheritanceTooltip = ({ inheritedFrom }: { inheritedFrom?: string }) => (
  <>
    {inheritedFrom && (
      <span
        className="group relative px-2 md:break-normal"
        data-tip={`Inherited from: ${inheritedFrom}`}
      >
        <InformationCircleIcon className="h-4 w-4" aria-hidden="true" />
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-primary-foreground bg-primary rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          Inherited from: {inheritedFrom}
        </span>
      </span>
    )}
  </>
);
