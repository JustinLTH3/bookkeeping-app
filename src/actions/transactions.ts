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

export async function getTransactions(): Promise<TransactionResponse[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    include: { category: { select: { id: true, name: true } } },
  });

  return transactions.map((t) => ({
    id: t.id,
    amount: Number(t.amount),
    description: t.description,
    date: dayjs(t.date).format("YYYY-MM-DD"),
    categoryId: t.categoryId,
    category: t.category,
  }));
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

  return {
    id: transaction.id,
    amount: Number(transaction.amount),
    description: transaction.description,
    date: dayjs(transaction.date).format("YYYY-MM-DD"),
    categoryId: transaction.categoryId,
    category: transaction.category,
  };
}
