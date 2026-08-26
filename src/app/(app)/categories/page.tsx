"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CategoryTable } from "@/components/categories/CategoryTable";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import {
  getCategories,
  createCategory,
  renameCategory,
  deleteCategory,
} from "@/actions/categories";
import type { Category } from "@/actions/categories";
import { usePaginatedCache } from "@/hooks/usePaginatedCache";
import { CategorySchema } from "@/lib/schemas";

type CategoryFormValues = {
  name: string;
};

const ITEMS_PER_PAGE = 10;
const CACHE_WINDOW = 2;

export default function CategoriesPage() {
  const { data, totalPages, currentPage, goToPage, refresh, loading } =
    usePaginatedCache<Category>({
      fetcher: async (offset, limit) => {
        const result = await getCategories(offset, limit);
        return { data: result.categories, totalCount: result.totalCount };
      },
      pageSize: ITEMS_PER_PAGE,
      cacheWindow: CACHE_WINDOW,
    });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(CategorySchema),
    defaultValues: { name: "" },
  });

  function handleOpenAddModal() {
    setEditingCategory(null);
    reset({ name: "" });
    clearErrors();
    setIsModalOpen(true);
  }

  function handleOpenEditModal(category: Category) {
    setEditingCategory(category);
    reset({ name: category.name });
    clearErrors();
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setEditingCategory(null);
    setIsModalOpen(false);
  }

  async function handleDelete(id: string) {
    setDeleteError("");
    setDeletingId(id);
    try {
      await deleteCategory(id);
      const targetPage =
        data.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      await goToPage(targetPage, { forceRefresh: true });
    } catch {
      setDeleteError("Failed to delete category");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSave(values: CategoryFormValues) {
    setIsSaving(true);
    try {
      if (editingCategory) {
        await renameCategory({
          id: editingCategory.id,
          name: values.name,
        });
      } else {
        await createCategory({ name: values.name });
      }
      handleCloseModal();
      await refresh();
    } catch {
      setError("root", { message: "Failed to save category" });
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-8 py-10">
        <p className="text-sm text-tertiary">Loading categories...</p>
      </div>
    );
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
          categories={data}
          onEdit={handleOpenEditModal}
          onDelete={handleDelete}
          deletingId={deletingId}
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
        <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
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
              {...register("name")}
              className="w-full rounded-md border border-primary/10 px-3 py-2 text-sm text-primary outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
              placeholder="Category name"
              autoFocus
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>
          {errors.root && (
            <p className="text-sm text-red-600">{errors.root.message}</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCloseModal}
              className="rounded-md px-4 py-2 text-sm font-medium text-tertiary hover:bg-neutral"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
