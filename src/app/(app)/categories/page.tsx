"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CategoryTable } from "@/components/categories/CategoryTable";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import {
  getCategories,
  createCategory,
  renameCategory,
  deleteCategory,
} from "@/actions/categories";

export type Category = {
  id: string;
  name: string;
};

const ITEMS_PER_PAGE = 10;
const CACHE_WINDOW = 2;

export default function CategoriesPage() {
  const [pageCache, setPageCache] = useState<Record<number, Category[]>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageCacheRef = useRef(pageCache);
  const totalCountRef = useRef(totalCount);

  useEffect(() => {
    pageCacheRef.current = pageCache;
  }, [pageCache]);

  useEffect(() => {
    totalCountRef.current = totalCount;
  }, [totalCount]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const displayData = pageCache[currentPage] ?? [];

  const trimCache = useCallback((centerPage: number) => {
    setPageCache((prev) => {
      const min = centerPage - CACHE_WINDOW;
      const max = centerPage + CACHE_WINDOW;
      const next: Record<number, Category[]> = {};
      for (const key of Object.keys(prev)) {
        const n = Number(key);
        if (n >= min && n <= max) next[n] = prev[n];
      }
      return next;
    });
  }, []);

  const preloadPages = useCallback((activePage: number) => {
    const maxPage = Math.max(
      1,
      Math.ceil(totalCountRef.current / ITEMS_PER_PAGE),
    );
    const min = Math.max(1, activePage - CACHE_WINDOW);
    const max = Math.min(maxPage, activePage + CACHE_WINDOW);
    for (let p = min; p <= max; p++) {
      if (pageCacheRef.current[p]) continue;
      getCategories(p, ITEMS_PER_PAGE).then(
        ({ categories, totalCount: count }) => {
          setPageCache((prev) => ({ ...prev, [p]: categories }));
          setTotalCount((prev) => Math.max(prev, count));
        },
      );
    }
  }, []);

  const refreshCachedPages = useCallback(async (centerPage: number) => {
    const pageSet = new Set(Object.keys(pageCacheRef.current).map(Number));
    pageSet.add(centerPage);

    const newCache: Record<number, Category[]> = {};
    let maxTotal = 0;

    await Promise.all(
      Array.from(pageSet, async (p) => {
        const { categories, totalCount: count } = await getCategories(
          p,
          ITEMS_PER_PAGE,
        );
        newCache[p] = categories;
        if (count > maxTotal) maxTotal = count;
      }),
    );

    setPageCache(newCache);
    setTotalCount(maxTotal);
  }, []);

  const goToPage = useCallback(
    async (page: number) => {
      if (page < 1 || page > totalPages) return;

      if (!pageCacheRef.current[page]) {
        await refreshCachedPages(page);
      }

      setCurrentPage(page);
      preloadPages(page);
      trimCache(page);
    },
    [totalPages, refreshCachedPages, preloadPages, trimCache],
  );

  useEffect(() => {
    async function load() {
      const { categories, totalCount: count } = await getCategories(
        1,
        ITEMS_PER_PAGE,
      );
      setPageCache({ 1: categories });
      setTotalCount(count);
    }
    load();
  }, []);

  function handleOpenAddModal() {
    setEditingCategory(null);
    setName("");
    setError("");
    setIsModalOpen(true);
  }

  function handleOpenEditModal(category: Category) {
    setEditingCategory(category);
    setName(category.name);
    setError("");
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setEditingCategory(null);
    setIsModalOpen(false);
  }

  async function handleDelete(id: string) {
    setDeleteError("");
    try {
      await deleteCategory(id);
      const preDeleteData = pageCacheRef.current[currentPage] ?? [];
      if (preDeleteData.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
        await refreshCachedPages(currentPage - 1);
        preloadPages(currentPage - 1);
        trimCache(currentPage - 1);
      } else {
        await refreshCachedPages(currentPage);
        preloadPages(currentPage);
        trimCache(currentPage);
      }
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete category",
      );
    }
  }

  async function handleSave() {
    setError("");
    if (!name.trim()) {
      setError("Category name is required");
      return;
    }

    setIsSaving(true);
    try {
      if (editingCategory) {
        await renameCategory({
          id: editingCategory.id,
          name: name.trim(),
        });
      } else {
        await createCategory({ name: name.trim() });
      }
      await refreshCachedPages(currentPage);
      preloadPages(currentPage);
      trimCache(currentPage);
      handleCloseModal();
    } catch {
      setError("Failed to save category");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-primary text-3xl font-semibold tracking-tight">
          Categories
        </h1>
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90"
        >
          Add Category
        </button>
      </div>

      <div className="mt-8">
        {deleteError && (
          <p className="mb-4 text-sm text-red-600">{deleteError}</p>
        )}
        <CategoryTable
          categories={displayData}
          onEdit={handleOpenEditModal}
          onDelete={handleDelete}
        />
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
        />
      </div>

      <Modal
        open={isModalOpen}
        onClose={handleCloseModal}
        title={editingCategory ? "Edit Category" : "Add Category"}
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium text-primary"
            >
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-primary/10 px-3 py-2 text-sm text-primary outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
              placeholder="Category name"
              autoFocus
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={isSaving}
              className="rounded-md px-4 py-2 text-sm font-medium text-tertiary hover:bg-neutral disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
