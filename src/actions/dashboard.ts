"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(isoWeek);

export type SummaryData = {
  weekIncome: number;
  weekExpense: number;
  netBalance: number;
  monthNetFlow: number;
};

export type CategoryExpense = {
  categoryName: string;
  total: number;
};

export type CashFlowPoint = {
  date: string;
  balance: number;
};

export type RecentTransaction = {
  id: string;
  amount: number;
  description: string | null;
  date: string;
  categoryName: string;
};

export async function getDashboardSummary(): Promise<SummaryData> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const now = dayjs();
  const weekStart = now.startOf("isoWeek").toDate();
  const monthStart = now.startOf("month").toDate();

  const [allTransactions, weekTransactions, monthTransactions] =
    await Promise.all([
      prisma.transaction.findMany({
        where: { userId: session.user.id },
        select: { amount: true },
      }),
      prisma.transaction.findMany({
        where: { userId: session.user.id, date: { gte: weekStart } },
        select: { amount: true },
      }),
      prisma.transaction.findMany({
        where: { userId: session.user.id, date: { gte: monthStart } },
        select: { amount: true },
      }),
    ]);

  const toNum = (t: { amount: unknown }) => Number(t.amount);

  const weekIncome = weekTransactions
    .filter((t) => Number(t.amount) > 0)
    .reduce((s, t) => s + toNum(t), 0);
  const weekExpense = weekTransactions
    .filter((t) => Number(t.amount) < 0)
    .reduce((s, t) => s + toNum(t), 0);

  const netBalance = allTransactions.reduce((s, t) => s + toNum(t), 0);

  const monthNetFlow = monthTransactions.reduce((s, t) => s + toNum(t), 0);

  return { weekIncome, weekExpense, netBalance, monthNetFlow };
}

function getStartDate(timeRange: "week" | "month" | "year" | "ytd") {
  const now = dayjs();
  switch (timeRange) {
    case "week":
      return now.startOf("isoWeek");
    case "month":
      return now.startOf("month");
    case "year":
    case "ytd":
      return now.startOf("year");
  }
}

export async function getExpensesByCategory(
  timeRange: "week" | "month" | "year" | "ytd" = "month",
): Promise<CategoryExpense[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const startDate = getStartDate(timeRange).toDate();

  const expenses = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      date: { gte: startDate },
      amount: { lt: 0 },
    },
    select: { amount: true, category: { select: { name: true } } },
  });

  const grouped: Record<string, number> = {};
  for (const e of expenses) {
    const name = e.category.name;
    grouped[name] = (grouped[name] || 0) + Number(e.amount);
  }

  return Object.entries(grouped)
    .map(([categoryName, total]) => ({ categoryName, total }))
    .sort((a, b) => a.total - b.total);
}

export async function getCashFlow(
  timeRange: "week" | "month" | "year" | "ytd",
): Promise<CashFlowPoint[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const now = dayjs();
  const startDate = getStartDate(timeRange);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      date: { gte: startDate.toDate() },
    },
    orderBy: { date: "asc" },
    select: { amount: true, date: true },
  });

  const dailyMap: Record<string, number> = {};
  for (const t of transactions) {
    const key = dayjs(t.date).format("YYYY-MM-DD");
    dailyMap[key] = (dailyMap[key] || 0) + Number(t.amount);
  }

  let cumulative = 0;
  const result: CashFlowPoint[] = [];
  let cursor = startDate.clone();
  while (cursor.isBefore(now.add(1, "day"))) {
    const key = cursor.format("YYYY-MM-DD");
    cumulative += dailyMap[key] || 0;
    result.push({ date: key, balance: cumulative });
    cursor = cursor.add(1, "day");
  }

  return result;
}

export async function getRecentTransactions(): Promise<RecentTransaction[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: 5,
    select: {
      id: true,
      amount: true,
      description: true,
      date: true,
      category: { select: { name: true } },
    },
  });

  return transactions.map((t) => ({
    id: t.id,
    amount: Number(t.amount),
    description: t.description,
    date: dayjs(t.date).format("YYYY-MM-DD"),
    categoryName: t.category.name,
  }));
}
