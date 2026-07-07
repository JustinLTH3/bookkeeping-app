type Props = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ currentPage, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-sm text-tertiary">
        Page {currentPage} of {totalPages}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-tertiary hover:bg-neutral disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Prev
        </button>

        {pages.map((page, index) =>
          page === null ? (
            <span key={`ellipsis-${index}`} className="px-1 text-tertiary">
              ...
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={`min-w-[2rem] rounded-md px-2 py-1.5 text-sm font-medium ${
                page === currentPage
                  ? "bg-secondary text-white"
                  : "text-tertiary hover:bg-neutral"
              }`}
            >
              {page}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-tertiary hover:bg-neutral disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function getPageNumbers(current: number, total: number): (number | null)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | null)[] = [1];

  if (current > 3) {
    pages.push(null);
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push(null);
  }

  pages.push(total);

  return pages;
}
