"use client";

import { useState, useEffect } from "react";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/actions/transactions";
import { getCategories } from "@/actions/categories";
import dayjs from "dayjs";

export type Transaction = {
  id: string;
  amount: number;
  description: string | null;
  date: string;
  categoryId: string;
  category: { id: string; name: string };
};

type Category = { id: string; name: string };

const ITEMS_PER_PAGE = 10;
const CACHE_WINDOW = 2;

export default function TransactionsPage() {
  const [pageCache, setPageCache] = useState<Record<number, Transaction[]>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const displayData = pageCache[currentPage] ?? [];

  async function refreshCachedPages(
    centerPage: number,
    currentCache: Record<number, Transaction[]>,
  ) {
    const pageSet = new Set(Object.keys(currentCache).map(Number));
    pageSet.add(centerPage);
    const min = centerPage - CACHE_WINDOW;
    const max = centerPage + CACHE_WINDOW;

    const newCache: Record<number, Transaction[]> = {};
    let maxTotal = 0;

    await Promise.all(
      Array.from(pageSet, async (p) => {
        if (p < min || p > max) return;
        const { transactions, totalCount: count } = await getTransactions(
          p,
          ITEMS_PER_PAGE,
        );
        newCache[p] = transactions;
        if (count > maxTotal) maxTotal = count;
      }),
    );

    setPageCache(newCache);
    setTotalCount(maxTotal);
  }

  async function goToPage(page: number) {
    if (page < 1 || page > totalPages) return;
    if (!pageCache[page]) {
      await refreshCachedPages(page, pageCache);
    }
    setCurrentPage(page);
  }

  useEffect(() => {
    async function load() {
      const [txnResult, catResult] = await Promise.all([
        getTransactions(1, ITEMS_PER_PAGE),
        getCategories(),
      ]);
      setPageCache({ 1: txnResult.transactions });
      setTotalCount(txnResult.totalCount);
      setCategories(catResult.categories);
    }
    load();
  }, []);

  function handleOpenAddModal() {
    setEditingTransaction(null);
    setAmount("");
    setDate(dayjs().format("YYYY-MM-DD"));
    setCategoryId(categories[0]?.id ?? "");
    setDescription("");
    setError("");
    setIsModalOpen(true);
  }

  function handleOpenEditModal(transaction: Transaction) {
    setEditingTransaction(transaction);
    setAmount(transaction.amount.toString());
    setDate(dayjs(transaction.date).format("YYYY-MM-DD"));
    setCategoryId(transaction.categoryId);
    setDescription(transaction.description || "");
    setError("");
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setEditingTransaction(null);
    setIsModalOpen(false);
  }

  async function handleDelete(id: string) {
    setDeleteError("");
    try {
      await deleteTransaction(id);
      const preDeleteData = pageCache[currentPage] ?? [];
      if (preDeleteData.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
        await refreshCachedPages(currentPage - 1, pageCache);
      } else {
        await refreshCachedPages(currentPage, pageCache);
      }
    } catch {
      setDeleteError("Failed to delete transaction");
    }
  }

  async function handleSave() {
    setError("");

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount === 0) {
      setError("Amount must be a non-zero number");
      return;
    }
    if (!date) {
      setError("Date is required");
      return;
    }
    if (!categoryId) {
      setError("Category is required");
      return;
    }

    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, {
          amount: numAmount,
          description: description || null,
          date,
          categoryId,
        });
      } else {
        await createTransaction({
          amount: numAmount,
          description: description || null,
          date,
          categoryId,
        });
      }
      handleCloseModal();
      await refreshCachedPages(currentPage, pageCache);
    } catch {
      setError("Failed to save transaction");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-primary text-3xl font-semibold tracking-tight">
          Transactions
        </h1>
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90"
        >
          Add Transaction
        </button>
      </div>

      <div className="mt-8">
        {deleteError && (
          <p className="mb-4 text-sm text-red-600">{deleteError}</p>
        )}
        <TransactionTable
          transactions={displayData}
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
        title={editingTransaction ? "Edit Transaction" : "Add Transaction"}
      >
        <div className="space-y-4">
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-md border border-primary/10 px-3 py-2 text-sm text-primary outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
              placeholder="0.00"
              autoFocus
            />
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
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border border-primary/10 px-3 py-2 text-sm text-primary outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
            />
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
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-primary/10 px-3 py-2 text-sm text-primary outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
              placeholder="Optional"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

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
              {editingTransaction ? "Save" : "Add"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
