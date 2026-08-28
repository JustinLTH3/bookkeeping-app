"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/actions/transactions";
import type { Transaction } from "@/actions/transactions";
import { getCategories } from "@/actions/categories";
import type { Category } from "@/actions/categories";
import { usePaginatedCache } from "@/hooks/usePaginatedCache";
import { TransactionSchema } from "@/lib/schemas";
import dayjs from "dayjs";

type TransactionFormValues = {
  amount: number;
  date: string;
  categoryId: string;
  description: string | null;
};

const ITEMS_PER_PAGE = 10;
const CACHE_WINDOW = 2;

export default function TransactionsPage() {
  const {
    data,
    totalPages,
    currentPage,
    goToPage,
    refresh,
    loading,
  } = usePaginatedCache<Transaction>({
    fetcher: async (offset, limit) => {
      const result = await getTransactions(offset, limit);
      return { data: result.transactions, totalCount: result.totalCount };
    },
    pageSize: ITEMS_PER_PAGE,
    cacheWindow: CACHE_WINDOW,
  });
  const [categories, setCategories] = useState<Category[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
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
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(TransactionSchema) as unknown as Resolver<TransactionFormValues>,
    defaultValues: {
      amount: undefined,
      date: dayjs().format("YYYY-MM-DD"),
      categoryId: "",
      description: "",
    },
  });

  useEffect(() => {
    async function load() {
      const { categories } = await getCategories();
      setCategories(categories);
    }
    load();
  }, []);

  function handleOpenAddModal() {
    setEditingTransaction(null);
    reset({
      amount: undefined,
      date: dayjs().format("YYYY-MM-DD"),
      categoryId: categories[0]?.id ?? "",
      description: "",
    });
    clearErrors();
    setIsModalOpen(true);
  }

  function handleOpenEditModal(transaction: Transaction) {
    setEditingTransaction(transaction);
    reset({
      amount: transaction.amount,
      date: dayjs(transaction.date).format("YYYY-MM-DD"),
      categoryId: transaction.categoryId,
      description: transaction.description,
    });
    clearErrors();
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setEditingTransaction(null);
    setIsModalOpen(false);
  }

  async function handleDelete(id: string) {
    setDeleteError("");
    setDeletingId(id);
    try {
      await deleteTransaction(id);
      const targetPage =
        data.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      await goToPage(targetPage, { forceRefresh: true });
    } catch {
      setDeleteError("Failed to delete transaction");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSave(values: TransactionFormValues) {
    setIsSaving(true);
    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, {
          amount: values.amount,
          description: values.description || null,
          date: values.date,
          categoryId: values.categoryId,
        });
      } else {
        await createTransaction({
          amount: values.amount,
          description: values.description || null,
          date: values.date,
          categoryId: values.categoryId,
        });
      }
      handleCloseModal();
      await refresh();
    } catch {
      setError("root", { message: "Failed to save transaction" });
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-8 py-10">
        <p className="text-sm text-tertiary">Loading transactions...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-primary text-3xl font-semibold tracking-tight">
          Transactions
        </h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenAddModal}
            disabled={categories.length === 0}
            className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add Transaction
          </button>
          {categories.length === 0 && (
            <p className="text-sm text-tertiary">Add a category first</p>
          )}
        </div>
      </div>

      <div className="mt-8">
        {deleteError && (
          <p className="mb-4 text-sm text-red-600">{deleteError}</p>
        )}
        <TransactionTable
          transactions={data}
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
        title={editingTransaction ? "Edit Transaction" : "Add Transaction"}
      >
        <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
          <div>
            <label
              htmlFor="amount"
              className="mb-1 block text-sm font-medium text-primary"
            >
              Amount
            </label>
            <input
              id="amount"
              type="number"
              step="0.01"
              {...register("amount")}
              className="w-full rounded-md border border-primary/10 px-3 py-2 text-sm text-primary outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
              placeholder="0.00"
              autoFocus
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">
                {errors.amount.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="date"
              className="mb-1 block text-sm font-medium text-primary"
            >
              Date
            </label>
            <input
              id="date"
              type="date"
              {...register("date")}
              className="w-full rounded-md border border-primary/10 px-3 py-2 text-sm text-primary outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="category"
              className="mb-1 block text-sm font-medium text-primary"
            >
              Category
            </label>
            <select
              id="category"
              {...register("categoryId")}
              className="w-full rounded-md border border-primary/10 px-3 py-2 text-sm text-primary outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
            >
              <option value="" disabled>
                Select a category
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <p className="mt-1 text-sm text-red-600">
                {errors.categoryId.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-1 block text-sm font-medium text-primary"
            >
              Description
            </label>
            <input
              id="description"
              type="text"
              {...register("description")}
              className="w-full rounded-md border border-primary/10 px-3 py-2 text-sm text-primary outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
              placeholder="Optional"
            />
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
              {editingTransaction ? "Save" : "Add"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
