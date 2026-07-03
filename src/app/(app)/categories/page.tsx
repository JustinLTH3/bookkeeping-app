"use client";

import { useState, useMemo } from "react";
import { CategoryTable } from "@/components/categories/CategoryTable";
import { Pagination } from "@/components/ui/Pagination";

export type Category = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
};

const ITEMS_PER_PAGE = 10;

export default function CategoriesPage() {
  const [categories] = useState<Category[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(categories.length / ITEMS_PER_PAGE);

  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return categories.slice(start, start + ITEMS_PER_PAGE);
  }, [categories, currentPage]);

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <h1 className="text-primary text-3xl font-semibold tracking-tight">
        Categories
      </h1>

      <div className="mt-8">
        <CategoryTable categories={paginatedCategories} />
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
