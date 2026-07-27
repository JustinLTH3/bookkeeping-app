"use client";

import { useState, useEffect } from "react";
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const displayData = pageCache[currentPage] ?? [];

  async function refreshCachedPages(centerPage: number) {
    const min = Math.max(1, centerPage - CACHE_WINDOW);
    const max = centerPage + CACHE_WINDOW;

    const offset = (min - 1) * ITEMS_PER_PAGE;
    const count = (max - min + 1) * ITEMS_PER_PAGE;

    const { categories, totalCount } = await getCategories(offset, count);

    const newCache: Record<number, Category[]> = {};
    let page = min;
    for (let start = 0; start < categories.length; start += ITEMS_PER_PAGE) {
      newCache[page++] = categories.slice(
        start,
        Math.min(start + ITEMS_PER_PAGE, categories.length),
      );
    }

    setPageCache(newCache);
    setTotalCount(totalCount);
  }

  async function goToPage(page: number) {
    if (page < 1 || page > totalPages) return;
    if (!pageCache[page]) {
      await refreshCachedPages(page);
    }
    setCurrentPage(page);
  }

  useEffect(() => {
    async function load() {
      await refreshCachedPages(1);
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
      const preDeleteData = pageCache[currentPage] ?? [];
      if (preDeleteData.length === 1 && currentPage > 1) {
        const targetPage = currentPage - 1;
        setCurrentPage(targetPage);
        await refreshCachedPages(targetPage);
      } else {
        await refreshCachedPages(currentPage);
      }
    } catch {
      setDeleteError("Failed to delete category");
    }
  }

  async function handleSave() {
    setError("");
    if (!name.trim()) {
      setError("Category name is required");
      return;
    }

    try {
      if (editingCategory) {
        await renameCategory({
          id: editingCategory.id,
          name: name.trim(),
        });
      } else {
        await createCategory({ name: name.trim() });
      }
      handleCloseModal();
      await refreshCachedPages(currentPage);
    } catch {
      setError("Failed to save category");
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
              className="rounded-md px-4 py-2 text-sm font-medium text-tertiary hover:bg-neutral"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90"
            >
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
