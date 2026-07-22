"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(isoWeek);

export type SummaryData = {
  weekIncome: number;
  weekExpense: number;
  netBalance: number;
  periodNetFlow: number;
  periodLabel: string;
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

const PERIOD_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
  ytd: "Year to Date",
};

function startOfQuarter(d: dayjs.Dayjs) {
  const q = Math.floor(d.month() / 3);
  return d.month(q * 3).startOf("month");
}

function endOfQuarter(d: dayjs.Dayjs) {
  const q = Math.floor(d.month() / 3);
  return d.month(q * 3 + 2).endOf("month");
}

function getEndDate(
  timeRange: "weekly" | "monthly" | "quarterly" | "yearly" | "ytd",
) {
  const now = dayjs();
  switch (timeRange) {
    case "weekly":
      return now.endOf("isoWeek").startOf("day");
    case "monthly":
      return now.endOf("month").startOf("day");
    case "quarterly":
      return endOfQuarter(now).startOf("day");
    case "yearly":
      return now.endOf("year").startOf("day");
    case "ytd":
      return now.startOf("day");
  }
}

async function _getDashboardSummary(
  userId: string,
  timeRange: "weekly" | "monthly" | "quarterly" | "yearly" | "ytd",
): Promise<SummaryData> {
  const now = dayjs();
  const weekStart = now.startOf("isoWeek").toDate();
  const periodStart = getStartDate(timeRange).toDate();

  const [allTransactions, weekTransactions, periodTransactions] =
    await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
        select: { amount: true },
      }),
      prisma.transaction.findMany({
        where: { userId, date: { gte: weekStart } },
        select: { amount: true },
      }),
      prisma.transaction.findMany({
        where: { userId, date: { gte: periodStart } },
        select: { amount: true },
      }),
    ]);

  const zero = new Prisma.Decimal(0);

  const weekIncome = weekTransactions
    .filter((t) => t.amount.gt(0))
    .reduce((s, t) => s.plus(t.amount), zero)
    .toNumber();
  const weekExpense = weekTransactions
    .filter((t) => t.amount.lt(0))
    .reduce((s, t) => s.plus(t.amount), zero)
    .toNumber();

  const netBalance = allTransactions
    .reduce((s, t) => s.plus(t.amount), zero)
    .toNumber();

  const periodNetFlow = periodTransactions
    .reduce((s, t) => s.plus(t.amount), zero)
    .toNumber();

  return {
    weekIncome,
    weekExpense,
    netBalance,
    periodNetFlow,
    periodLabel: PERIOD_LABELS[timeRange],
  };
}

export async function getDashboardSummary(
  timeRange: "weekly" | "monthly" | "quarterly" | "yearly" | "ytd" = "monthly",
): Promise<SummaryData> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return _getDashboardSummary(session.user.id, timeRange);
}

function getStartDate(
  timeRange: "weekly" | "monthly" | "quarterly" | "yearly" | "ytd",
) {
  const now = dayjs();
  switch (timeRange) {
    case "weekly":
      return now.startOf("isoWeek");
    case "monthly":
      return now.startOf("month");
    case "quarterly":
      return startOfQuarter(now);
    case "yearly":
    case "ytd":
      return now.startOf("year");
  }
}

async function _getExpensesByCategory(
  userId: string,
  timeRange: "weekly" | "monthly" | "quarterly" | "yearly" | "ytd",
): Promise<CategoryExpense[]> {
  const startDate = getStartDate(timeRange).toDate();

  const expenses = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: startDate },
      amount: { lt: 0 },
    },
    select: { amount: true, category: { select: { name: true } } },
  });

  const grouped: Record<string, Prisma.Decimal> = {};
  for (const e of expenses) {
    const name = e.category.name;
    grouped[name] = (grouped[name] || new Prisma.Decimal(0)).plus(e.amount);
  }

  return Object.entries(grouped)
    .map(([categoryName, total]) => ({ categoryName, total: total.toNumber() }))
    .sort((a, b) => a.total - b.total);
}

export async function getExpensesByCategory(
  timeRange: "weekly" | "monthly" | "quarterly" | "yearly" | "ytd" = "monthly",
): Promise<CategoryExpense[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return _getExpensesByCategory(session.user.id, timeRange);
}

async function _getCashFlow(
  userId: string,
  timeRange: "weekly" | "monthly" | "quarterly" | "yearly" | "ytd",
): Promise<CashFlowPoint[]> {
  const startDate = getStartDate(timeRange);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: startDate.toDate() },
    },
    orderBy: { date: "asc" },
    select: { amount: true, date: true },
  });

  const dailyMap: Record<string, Prisma.Decimal> = {};
  for (const t of transactions) {
    const key = dayjs(t.date).format("YYYY-MM-DD");
    dailyMap[key] = (dailyMap[key] || new Prisma.Decimal(0)).plus(t.amount);
  }

  let cumulative = new Prisma.Decimal(0);
  const result: CashFlowPoint[] = [];
  let cursor = startDate.clone();
  const endDate = getEndDate(timeRange);
  while (cursor.isBefore(endDate.add(1, "day"))) {
    const key = cursor.format("YYYY-MM-DD");
    cumulative = cumulative.plus(dailyMap[key] || new Prisma.Decimal(0));
    result.push({ date: key, balance: cumulative.toNumber() });
    cursor = cursor.add(1, "day");
  }

  return result;
}

export async function getCashFlow(
  timeRange: "weekly" | "monthly" | "quarterly" | "yearly" | "ytd",
): Promise<CashFlowPoint[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return _getCashFlow(session.user.id, timeRange);
}

async function _getRecentTransactions(
  userId: string,
): Promise<RecentTransaction[]> {
  const transactions = await prisma.transaction.findMany({
    where: { userId },
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
    amount: t.amount.toNumber(),
    description: t.description,
    date: dayjs(t.date).format("YYYY-MM-DD"),
    categoryName: t.category.name,
  }));
}

export async function getRecentTransactions(): Promise<RecentTransaction[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return _getRecentTransactions(session.user.id);
}

export type DashboardData = {
  summary: SummaryData;
  expensesByCategory: CategoryExpense[];
  cashFlow: CashFlowPoint[];
  recentTransactions: RecentTransaction[];
};

export async function getDashboardData(
  timeRange: "weekly" | "monthly" | "quarterly" | "yearly" | "ytd" = "monthly",
): Promise<DashboardData> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  const [summary, expensesByCategory, cashFlow, recentTransactions] =
    await Promise.all([
      _getDashboardSummary(userId, timeRange),
      _getExpensesByCategory(userId, timeRange),
      _getCashFlow(userId, timeRange),
      _getRecentTransactions(userId),
    ]);

  return { summary, expensesByCategory, cashFlow, recentTransactions };
}
