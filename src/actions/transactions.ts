"use server";

import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import dayjs from "dayjs";
import { z } from "zod";

export type TransactionResponse = {
  id: string;
  amount: number;
  description: string | null;
  date: string;
  categoryId: string;
  category: { id: string; name: string };
};

const TransactionInput = z.object({
  amount: z.preprocess(
    (v) => (typeof v === "number" && (isNaN(v) || v === 0) ? 0 : v),
    z.number().refine((v) => v !== 0, {
      message: "Amount must be a non-zero number",
    }),
  ),
  description: z.string().nullable(),
  date: z.string().min(1, "Date is required"),
  categoryId: z.string().min(1, "Category is required"),
});

export async function getTransactions(
  offset = 0,
  limit = 10,
): Promise<{ transactions: TransactionResponse[]; totalCount: number }> {
  const userId = await requireUserId();

  const where = { userId };
  const skip = offset;

  const [rows, totalCount] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: [{ date: "desc" }, { id: "desc" }],
      skip,
      take: limit,
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.transaction.count({ where }),
  ]);

  const transactions = rows.map((t) => ({
    id: t.id,
    amount: Number(t.amount),
    description: t.description,
    date: dayjs(t.date).format("YYYY-MM-DD"),
    categoryId: t.categoryId,
    category: t.category,
  }));

  return { transactions, totalCount };
}

function revalidateTransactionPaths() {
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

async function validateCategoryOwnership(categoryId: string, userId: string) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });
  if (!category) throw new Error("Category not found");
}

export async function createTransaction(data: {
  amount: number;
  description: string | null;
  date: string;
  categoryId: string;
}): Promise<TransactionResponse> {
  const userId = await requireUserId();

  const parsed = TransactionInput.safeParse(data);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const { amount, description, date, categoryId } = parsed.data;

  await validateCategoryOwnership(categoryId, userId);

  const transaction = await prisma.transaction.create({
    data: {
      amount,
      description,
      date: new Date(`${date}T00:00:00.000Z`),
      userId,
      categoryId,
    },
    include: { category: { select: { id: true, name: true } } },
  });

  revalidateTransactionPaths();

  return {
    id: transaction.id,
    amount: Number(transaction.amount),
    description: transaction.description,
    date: dayjs(transaction.date).format("YYYY-MM-DD"),
    categoryId: transaction.categoryId,
    category: transaction.category,
  };
}

export async function updateTransaction(
  id: string,
  data: {
    amount: number;
    description: string | null;
    date: string;
    categoryId: string;
  },
): Promise<void> {
  const userId = await requireUserId();

  const parsed = TransactionInput.safeParse(data);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const { amount, description, date, categoryId } = parsed.data;

  await validateCategoryOwnership(categoryId, userId);

  await prisma.transaction.update({
    where: { id, userId },
    data: {
      amount,
      description,
      date: new Date(`${date}T00:00:00.000Z`),
      categoryId,
    },
  });

  revalidateTransactionPaths();
}

export async function deleteTransaction(id: string): Promise<void> {
  const userId = await requireUserId();

  await prisma.transaction.delete({
    where: { id, userId },
  });

  revalidateTransactionPaths();
}
