"use client";

import { useState, useMemo, useEffect } from "react";
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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  const totalPages = Math.ceil(categories.length / ITEMS_PER_PAGE);

  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return categories.slice(start, start + ITEMS_PER_PAGE);
  }, [categories, currentPage]);

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
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete category");
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
        const updated = await renameCategory({
          id: editingCategory.id,
          name: name.trim(),
        });
        setCategories((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c)),
        );
      } else {
        const category = await createCategory({ name: name.trim() });
        setCategories((prev) => [category, ...prev]);
      }
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
          categories={paginatedCategories}
          onEdit={handleOpenEditModal}
          onDelete={handleDelete}
        />
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
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
