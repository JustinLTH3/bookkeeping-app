"use client";

import { useState, useMemo } from "react";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
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

const DEFAULT_CATEGORIES: Category[] = [
  { id: "cat-food", name: "Food" },
  { id: "cat-transport", name: "Transport" },
  { id: "cat-housing", name: "Housing" },
  { id: "cat-utilities", name: "Utilities" },
  { id: "cat-entertainment", name: "Entertainment" },
  { id: "cat-salary", name: "Salary" },
  { id: "cat-other", name: "Other" },
];

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "1",
    amount: 5000,
    description: "Monthly salary",
    date: "2026-07-01",
    categoryId: "cat-salary",
    category: { id: "cat-salary", name: "Salary" },
  },
  {
    id: "2",
    amount: -25.5,
    description: "Lunch with team",
    date: "2026-07-02",
    categoryId: "cat-food",
    category: { id: "cat-food", name: "Food" },
  },
  {
    id: "3",
    amount: -15,
    description: "Gas station",
    date: "2026-07-03",
    categoryId: "cat-transport",
    category: { id: "cat-transport", name: "Transport" },
  },
  {
    id: "4",
    amount: -120,
    description: "Electric bill",
    date: "2026-07-05",
    categoryId: "cat-utilities",
    category: { id: "cat-utilities", name: "Utilities" },
  },
  {
    id: "5",
    amount: -45,
    description: "Movie tickets",
    date: "2026-07-06",
    categoryId: "cat-entertainment",
    category: { id: "cat-entertainment", name: "Entertainment" },
  },
  {
    id: "6",
    amount: -12.75,
    description: "Coffee",
    date: "2026-07-06",
    categoryId: "cat-food",
    category: { id: "cat-food", name: "Food" },
  },
  {
    id: "7",
    amount: -1500,
    description: "Rent",
    date: "2026-07-01",
    categoryId: "cat-housing",
    category: { id: "cat-housing", name: "Housing" },
  },
];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [categoryId, setCategoryId] = useState(DEFAULT_CATEGORIES[0].id);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return transactions.slice(start, start + ITEMS_PER_PAGE);
  }, [transactions, currentPage]);

  function handleOpenAddModal() {
    setEditingTransaction(null);
    setAmount("");
    setDate(dayjs().format("YYYY-MM-DD"));
    setCategoryId(DEFAULT_CATEGORIES[0].id);
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

  function handleDelete(id: string) {
    setDeleteError("");
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }

  function handleSave() {
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

    const category = DEFAULT_CATEGORIES.find((c) => c.id === categoryId)!;

    if (editingTransaction) {
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === editingTransaction.id
            ? { ...t, amount: numAmount, description: description || null, date, categoryId, category }
            : t,
        ),
      );
    } else {
      setTransactions((prev) => [
        {
          id: generateId(),
          amount: numAmount,
          description: description || null,
          date,
          categoryId,
          category,
        },
        ...prev,
      ]);
    }

    handleCloseModal();
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
          transactions={paginatedTransactions}
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
              {DEFAULT_CATEGORIES.map((cat) => (
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
