"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import dayjs from "dayjs";

export type TransactionResponse = {
  id: string;
  amount: number;
  description: string | null;
  date: string;
  categoryId: string;
  category: { id: string; name: string };
};

export async function getTransactions(
  page = 1,
  limit = 10,
): Promise<{ transactions: TransactionResponse[]; totalCount: number }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const where = { userId: session.user.id };
  const skip = (page - 1) * limit;

  const [rows, totalCount] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
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

export async function createTransaction(data: {
  amount: number;
  description: string | null;
  date: string;
  categoryId: string;
}): Promise<TransactionResponse> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (!data.amount || isNaN(data.amount) || data.amount === 0) {
    throw new Error("Amount must be a non-zero number");
  }
  if (!data.date) {
    throw new Error("Date is required");
  }
  if (!data.categoryId) {
    throw new Error("Category is required");
  }

  const transaction = await prisma.transaction.create({
    data: {
      amount: data.amount,
      description: data.description,
      date: dayjs(data.date).toDate(),
      userId: session.user.id,
      categoryId: data.categoryId,
    },
    include: { category: { select: { id: true, name: true } } },
  });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");

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
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (!data.amount || isNaN(data.amount) || data.amount === 0) {
    throw new Error("Amount must be a non-zero number");
  }
  if (!data.date) {
    throw new Error("Date is required");
  }
  if (!data.categoryId) {
    throw new Error("Category is required");
  }

  await prisma.transaction.update({
    where: { id, userId: session.user.id },
    data: {
      amount: data.amount,
      description: data.description,
      date: dayjs(data.date).toDate(),
      categoryId: data.categoryId,
    },
  });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

export async function deleteTransaction(id: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.transaction.delete({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}
