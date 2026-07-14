"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import { PieChart } from "@/components/charts/PieChart";
import { LineChart } from "@/components/charts/LineChart";
import {
  getDashboardSummary,
  getExpensesByCategory,
  getCashFlow,
  getRecentTransactions,
} from "@/actions/dashboard";
import type {
  SummaryData,
  CategoryExpense,
  CashFlowPoint,
  RecentTransaction,
} from "@/actions/dashboard";

const TIME_RANGES = [
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "ytd", label: "YTD" },
] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.abs(value));
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [pieData, setPieData] = useState<CategoryExpense[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlowPoint[]>([]);
  const [recentTxns, setRecentTxns] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [pieTimeRange, setPieTimeRange] = useState<
    "week" | "month" | "year" | "ytd"
  >("month");
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year" | "ytd">(
    "month",
  );

  useEffect(() => {
    async function load() {
      try {
        const [s, r] = await Promise.all([
          getDashboardSummary(),
          getRecentTransactions(),
        ]);
        setSummary(s);
        setRecentTxns(r);
      } catch {
        // keep empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    async function loadPie() {
      try {
        const p = await getExpensesByCategory(pieTimeRange);
        setPieData(p);
      } catch {
        // keep empty
      }
    }
    loadPie();
  }, [pieTimeRange]);

  useEffect(() => {
    async function loadCashFlow() {
      try {
        const cf = await getCashFlow(timeRange);
        setCashFlow(cf);
      } catch {
        // keep empty
      }
    }
    loadCashFlow();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="px-8 py-10">
        <p className="text-sm text-tertiary">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-8 py-10">
      <h1 className="text-primary text-3xl font-semibold tracking-tight">
        Dashboard
      </h1>

      {/* Summary Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard title="This Week">
          <div className="space-y-2">
            {summary && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-tertiary">Income</span>
                  <span className="text-sm font-medium text-secondary">
                    +{formatCurrency(summary.weekIncome)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-tertiary">Expense</span>
                  <span className="text-sm font-medium text-red-600">
                    -{formatCurrency(summary.weekExpense)}
                  </span>
                </div>
              </>
            )}
          </div>
        </SummaryCard>

        <SummaryCard title="Net Balance">
          {summary && (
            <p
              className={`text-2xl font-semibold tabular-nums ${
                summary.netBalance >= 0 ? "text-secondary" : "text-red-600"
              }`}
            >
              {summary.netBalance >= 0 ? "+" : "-"}
              {formatCurrency(summary.netBalance)}
            </p>
          )}
        </SummaryCard>

        <SummaryCard title="This Month Net Flow">
          {summary && (
            <p
              className={`text-2xl font-semibold tabular-nums ${
                summary.monthNetFlow >= 0 ? "text-secondary" : "text-red-600"
              }`}
            >
              {summary.monthNetFlow >= 0 ? "+" : "-"}
              {formatCurrency(summary.monthNetFlow)}
            </p>
          )}
        </SummaryCard>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pie Chart */}
        <div className="rounded-lg border border-primary/10 bg-white p-6 lg:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-primary text-lg font-semibold">
              Expenses by Category
            </h2>
            <select
              value={pieTimeRange}
              onChange={(e) =>
                setPieTimeRange(
                  e.target.value as "week" | "month" | "year" | "ytd",
                )
              }
              className="rounded-md border border-primary/10 px-3 py-1.5 text-sm text-primary outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
            >
              {TIME_RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          {pieData.length > 0 ? (
            <PieChart data={pieData} />
          ) : (
            <p className="py-8 text-center text-sm text-tertiary">
              No expenses for this period
            </p>
          )}
        </div>

        {/* Line Chart */}
        <div className="rounded-lg border border-primary/10 bg-white p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-primary text-lg font-semibold">Cash Flow</h2>
            <select
              value={timeRange}
              onChange={(e) =>
                setTimeRange(
                  e.target.value as "week" | "month" | "year" | "ytd",
                )
              }
              className="rounded-md border border-primary/10 px-3 py-1.5 text-sm text-primary outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
            >
              {TIME_RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          {cashFlow.length > 0 ? (
            <div className="h-64">
              <LineChart data={cashFlow} />
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-tertiary">
              No data for this period
            </p>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-lg border border-primary/10 bg-white">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-primary text-lg font-semibold">
            Recent Transactions
          </h2>
          <Link
            href="/transactions"
            className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90"
          >
            View All Transactions
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead>
              <tr className="bg-primary text-white">
                <th className="w-[20%] px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Date
                </th>
                <th className="w-[35%] px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Description
                </th>
                <th className="w-[25%] px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Category
                </th>
                <th className="w-[20%] px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral">
              {recentTxns.length > 0 ? (
                recentTxns.map((t) => {
                  const isIncome = t.amount >= 0;
                  return (
                    <tr key={t.id} className="hover:bg-neutral/50">
                      <td className="truncate px-6 py-4 text-sm text-primary">
                        {dayjs(t.date).format("MMM D, YYYY")}
                      </td>
                      <td className="truncate px-6 py-4 text-sm text-primary">
                        {t.description || "—"}
                      </td>
                      <td className="truncate px-6 py-4 text-sm text-primary">
                        {t.categoryName}
                      </td>
                      <td
                        className={`truncate px-6 py-4 text-right text-sm font-medium tabular-nums ${
                          isIncome ? "text-secondary" : "text-red-600"
                        }`}
                      >
                        {isIncome ? "+" : "-"}
                        {formatCurrency(t.amount)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-sm text-tertiary"
                  >
                    No transactions yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-primary/10 bg-white p-6">
      <h3 className="text-tertiary mb-3 text-sm font-medium uppercase tracking-wider">
        {title}
      </h3>
      {children}
    </div>
  );
}
