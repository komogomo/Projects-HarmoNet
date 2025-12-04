"use client";

import React from "react";

interface BoardPaginationProps {
  currentPage: number; // 1-based
  pageSize: number;
  totalItems: number;
  onChangePage: (page: number) => void;
  onChangePageSize: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export const BoardPagination: React.FC<BoardPaginationProps> = ({
  currentPage,
  pageSize,
  totalItems,
  onChangePage,
  onChangePageSize,
  pageSizeOptions = [10, 25, 50],
}) => {
  const safePageSize = pageSize > 0 ? pageSize : pageSizeOptions[0] ?? 10;
  const safeTotalItems = totalItems < 0 ? 0 : totalItems;
  const totalPages = Math.max(1, Math.ceil(safeTotalItems / safePageSize) || 1);
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const canPrev = safeCurrentPage > 1;
  const canNext = safeCurrentPage < totalPages;

  const startIndex = safeTotalItems === 0 ? 0 : (safeCurrentPage - 1) * safePageSize;
  const startItem = safeTotalItems === 0 ? 0 : startIndex + 1;
  const endItem = safeTotalItems === 0 ? 0 : Math.min(startIndex + safePageSize, safeTotalItems);

  const handlePrev = () => {
    if (!canPrev) return;
    onChangePage(safeCurrentPage - 1);
  };

  const handleNext = () => {
    if (!canNext) return;
    onChangePage(safeCurrentPage + 1);
  };

  const handleChangePageSize = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const size = Number(event.target.value);
    if (!Number.isFinite(size) || size <= 0) return;
    onChangePageSize(size);
  };

  return (
    <div
      className="mt-4 flex flex-col md:flex-row justify-between items-center space-y-3 md:space-y-0 text-[11px] md:text-sm text-gray-600"
      data-testid="board-top-pagination"
    >
      <div className="flex items-center space-x-2">
        <span>表示件数:</span>
        <select
          value={safePageSize}
          onChange={handleChangePageSize}
          className="rounded border border-gray-300 py-1 px-2 text-xs md:text-sm focus:border-blue-500 focus:outline-none"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span>
          {safeTotalItems} 件中 {startItem} - {endItem} 件を表示
        </span>
      </div>

      <div className="flex space-x-1">
        <button
          type="button"
          onClick={handlePrev}
          disabled={!canPrev}
          className={`px-3 py-1 rounded-md border-2 text-xs md:text-sm transition-colors ${
            !canPrev
              ? "border-gray-200 bg-white text-gray-300 cursor-not-allowed"
              : "border-gray-300 bg-white text-gray-700 hover:border-blue-600 hover:text-blue-600"
          }`}
        >
          前へ
        </button>
        <span className="px-3 py-1 text-xs md:text-sm text-gray-700">
          {safeCurrentPage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={handleNext}
          disabled={!canNext}
          className={`px-3 py-1 rounded-md border-2 text-xs md:text-sm transition-colors ${
            !canNext
              ? "border-gray-200 bg-white text-gray-300 cursor-not-allowed"
              : "border-blue-400 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-500"
          }`}
        >
          次へ
        </button>
      </div>
    </div>
  );
};

BoardPagination.displayName = "BoardPagination";
