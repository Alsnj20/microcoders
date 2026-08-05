import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/outline";

type PaginationButtonProps = {
  currentPage: number;
  hasNextPage: boolean;
  setCurrentPage: (page: number) => void;
};

export const PaginationButton = ({ currentPage, hasNextPage, setCurrentPage }: PaginationButtonProps) => {
  const isPrevButtonDisabled = currentPage === 0;
  const isNextButtonDisabled = !hasNextPage;

  const prevButtonClass = isPrevButtonDisabled
    ? "opacity-50 pointer-events-none cursor-default"
    : "bg-primary text-primary-foreground";
  const nextButtonClass = isNextButtonDisabled
    ? "opacity-50 pointer-events-none cursor-default"
    : "bg-primary text-primary-foreground";

  if (isNextButtonDisabled && isPrevButtonDisabled) return null;

  return (
    <div className="mt-5 justify-end flex gap-3 mx-5">
      <button
        type="button"
        className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors h-8 px-3 text-xs ${prevButtonClass}`}
        disabled={isPrevButtonDisabled}
        onClick={() => setCurrentPage(currentPage - 1)}
        data-testid="blockexplorer-prev-page"
      >
        <ArrowLeftIcon className="h-4 w-4" />
      </button>
      <span className="self-center text-primary-foreground font-medium" data-testid="blockexplorer-page-label">
        Page {currentPage + 1}
      </span>
      <button
        type="button"
        className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors h-8 px-3 text-xs ${nextButtonClass}`}
        disabled={isNextButtonDisabled}
        onClick={() => setCurrentPage(currentPage + 1)}
        data-testid="blockexplorer-next-page"
      >
        <ArrowRightIcon className="h-4 w-4" />
      </button>
    </div>
  );
};
