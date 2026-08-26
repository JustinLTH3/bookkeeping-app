"use server";

import { requireUserId } from "@/lib/auth";

export type TimeRange = "weekly" | "monthly" | "quarterly" | "yearly" | "ytd";
import { prisma } from "@/lib/prisma";
import {
  dashboardSummary as dashboardSummarySql,
  expensesByCategory as expensesByCategorySql,
  cashFlowByDay as cashFlowByDaySql,
} from "@/generated/prisma/sql";
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

/** Convert a local-calendar day into the UTC-midnight Date the DATE column
 *  expects: the driver serializes Dates via UTC components, so a local
 *  midnight would store the previous day. */
function toUtcMidnight(d: dayjs.Dayjs): Date {
  return new Date(`${d.format("YYYY-MM-DD")}T00:00:00.000Z`);
}

function getEndDate(
  timeRange: TimeRange,
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
  timeRange: TimeRange,
): Promise<SummaryData> {
  const now = dayjs();
  const weekStart = toUtcMidnight(now.startOf("isoWeek"));
  const periodStart = toUtcMidnight(getStartDate(timeRange));

  const [row] = await prisma.$queryRawTyped(
    dashboardSummarySql(userId, weekStart, periodStart),
  );

  return {
    weekIncome: Number(row.week_income),
    weekExpense: Number(row.week_expense),
    netBalance: Number(row.net_balance),
    periodNetFlow: Number(row.period_net_flow),
    periodLabel: PERIOD_LABELS[timeRange],
  };
}

export async function getDashboardSummary(
  timeRange: TimeRange = "monthly",
): Promise<SummaryData> {
  const userId = await requireUserId();
  return _getDashboardSummary(userId, timeRange);
}

function getStartDate(
  timeRange: TimeRange,
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
  timeRange: TimeRange,
): Promise<CategoryExpense[]> {
  const startDate = toUtcMidnight(getStartDate(timeRange));

  const rows = await prisma.$queryRawTyped(
    expensesByCategorySql(userId, startDate),
  );

  return rows.map((r) => ({ categoryName: r.name, total: Number(r.total) }));
}

export async function getExpensesByCategory(
  timeRange: TimeRange = "monthly",
): Promise<CategoryExpense[]> {
  const userId = await requireUserId();
  return _getExpensesByCategory(userId, timeRange);
}

async function _getCashFlow(
  userId: string,
  timeRange: TimeRange,
): Promise<CashFlowPoint[]> {
  const startDate = toUtcMidnight(getStartDate(timeRange));

  const rows = await prisma.$queryRawTyped(cashFlowByDaySql(userId, startDate));

  const dailyMap: Record<string, number> = {};
  for (const r of rows) {
    dailyMap[dayjs(r.day).format("YYYY-MM-DD")] = Number(r.total);
  }

  let cumulative = new Prisma.Decimal(0);
  const result: CashFlowPoint[] = [];
  let cursor = dayjs(startDate);
  const endDate = getEndDate(timeRange);
  while (cursor.isBefore(endDate.add(1, "day"))) {
    const key = cursor.format("YYYY-MM-DD");
    cumulative = cumulative.plus(dailyMap[key] ?? 0);
    result.push({ date: key, balance: cumulative.toNumber() });
    cursor = cursor.add(1, "day");
  }

  return result;
}

export async function getCashFlow(
  timeRange: TimeRange,
): Promise<CashFlowPoint[]> {
  const userId = await requireUserId();
  return _getCashFlow(userId, timeRange);
}

async function _getRecentTransactions(
  userId: string,
): Promise<RecentTransaction[]> {
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
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
  const userId = await requireUserId();
  return _getRecentTransactions(userId);
}

export type DashboardData = {
  summary: SummaryData;
  expensesByCategory: CategoryExpense[];
  cashFlow: CashFlowPoint[];
  recentTransactions: RecentTransaction[];
};

export async function getDashboardData(
  timeRange: TimeRange = "monthly",
): Promise<DashboardData> {
  const userId = await requireUserId();

  const [summary, expensesByCategory, cashFlow, recentTransactions] =
    await Promise.all([
      _getDashboardSummary(userId, timeRange),
      _getExpensesByCategory(userId, timeRange),
      _getCashFlow(userId, timeRange),
      _getRecentTransactions(userId),
    ]);

  return { summary, expensesByCategory, cashFlow, recentTransactions };
}
