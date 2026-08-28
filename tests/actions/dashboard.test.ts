import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { Prisma } from "@/generated/prisma/client";
import {
  getDashboardSummary,
  getExpensesByCategory,
  getCashFlow,
  getRecentTransactions,
} from "@/actions/dashboard";

dayjs.extend(isoWeek);

const { mockRequireUserId, mockQueryRawTyped, mockFindMany, mockSqlFns } =
  vi.hoisted(() => ({
    mockRequireUserId: vi.fn(),
    mockQueryRawTyped: vi.fn(),
    mockFindMany: vi.fn(),
    mockSqlFns: {
      dashboardSummary: vi.fn(() => ({ query: "dashboardSummary" })),
      expensesByCategory: vi.fn(() => ({ query: "expensesByCategory" })),
      cashFlowByDay: vi.fn(() => ({ query: "cashFlowByDay" })),
    },
  }));

vi.mock("@/lib/auth", () => ({
  requireUserId: mockRequireUserId,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRawTyped: mockQueryRawTyped,
    transaction: {
      findMany: mockFindMany,
    },
  },
}));

vi.mock("@/generated/prisma/sql", () => mockSqlFns);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getDashboardSummary", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns summary with mixed income and expense", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));

    mockRequireUserId.mockResolvedValue("user-1");

    mockQueryRawTyped.mockResolvedValue([
      {
        net_balance: "295.00",
        period_income: "100.00",
        period_expense: "-30.00",
        period_net_flow: "295.00",
      },
    ]);

    const result = await getDashboardSummary();

    expect(result).toEqual({
      periodIncome: 100,
      periodExpense: -30,
      netBalance: 295,
      periodNetFlow: 295,
      periodLabel: "Monthly",
    });

    expect(mockQueryRawTyped).toHaveBeenCalledOnce();
    expect(mockSqlFns.dashboardSummary).toHaveBeenCalledWith(
      "user-1",
      new Date(`${dayjs().startOf("month").format("YYYY-MM-DD")}T00:00:00.000Z`),
    );
  });

  it("throws Unauthorized when no session", async () => {
    mockRequireUserId.mockRejectedValue(new Error("Unauthorized"));

    await expect(getDashboardSummary()).rejects.toThrow("Unauthorized");
    expect(mockQueryRawTyped).not.toHaveBeenCalled();
  });

  it("returns zeros when no transactions exist", async () => {
    mockRequireUserId.mockResolvedValue("user-1");
    mockQueryRawTyped.mockResolvedValue([
      {
        net_balance: "0",
        period_income: "0",
        period_expense: "0",
        period_net_flow: "0",
      },
    ]);

    const result = await getDashboardSummary();

    expect(result).toEqual({
      periodIncome: 0,
      periodExpense: 0,
      netBalance: 0,
      periodNetFlow: 0,
      periodLabel: "Monthly",
    });
  });

  it("propagates Prisma errors", async () => {
    mockRequireUserId.mockResolvedValue("user-1");
    const error = new Error("Database connection failed");
    mockQueryRawTyped.mockRejectedValue(error);

    await expect(getDashboardSummary()).rejects.toThrow(
      "Database connection failed",
    );
  });
});

describe("getExpensesByCategory", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("groups expenses by category and sorts ascending", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));

    mockRequireUserId.mockResolvedValue("user-1");

    mockQueryRawTyped.mockResolvedValue([
      { name: "Entertainment", total: "-100" },
      { name: "Food", total: "-70" },
      { name: "Transport", total: "-30" },
    ]);

    const result = await getExpensesByCategory("monthly");

    expect(result).toEqual([
      { categoryName: "Entertainment", total: -100 },
      { categoryName: "Food", total: -70 },
      { categoryName: "Transport", total: -30 },
    ]);

    expect(mockQueryRawTyped).toHaveBeenCalledOnce();
    expect(mockSqlFns.expensesByCategory).toHaveBeenCalledWith(
      "user-1",
      new Date(`${dayjs().startOf("month").format("YYYY-MM-DD")}T00:00:00.000Z`),
    );
  });

  it("throws Unauthorized when no session", async () => {
    mockRequireUserId.mockRejectedValue(new Error("Unauthorized"));

    await expect(getExpensesByCategory("monthly")).rejects.toThrow(
      "Unauthorized",
    );
    expect(mockQueryRawTyped).not.toHaveBeenCalled();
  });

  it("returns empty array when no expenses", async () => {
    mockRequireUserId.mockResolvedValue("user-1");
    mockQueryRawTyped.mockResolvedValue([]);

    const result = await getExpensesByCategory("monthly");

    expect(result).toEqual([]);
  });

  it("uses default timeRange of month", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));

    mockRequireUserId.mockResolvedValue("user-1");
    mockQueryRawTyped.mockResolvedValue([]);

    await getExpensesByCategory();

    expect(mockSqlFns.expensesByCategory).toHaveBeenCalledWith(
      "user-1",
      new Date(`${dayjs().startOf("month").format("YYYY-MM-DD")}T00:00:00.000Z`),
    );
  });

  it("propagates Prisma errors", async () => {
    mockRequireUserId.mockResolvedValue("user-1");
    const error = new Error("Database connection failed");
    mockQueryRawTyped.mockRejectedValue(error);

    await expect(getExpensesByCategory("monthly")).rejects.toThrow(
      "Database connection failed",
    );
  });
});

describe("getCashFlow", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns cumulative daily balance", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));

    mockRequireUserId.mockResolvedValue("user-1");

    mockQueryRawTyped.mockResolvedValue([
      { day: new Date("2024-06-12"), total: "100" },
      { day: new Date("2024-06-14"), total: "-20" },
    ]);

    const result = await getCashFlow("weekly");

    expect(result).toEqual([
      { date: "2024-06-10", balance: 0 },
      { date: "2024-06-11", balance: 0 },
      { date: "2024-06-12", balance: 100 },
      { date: "2024-06-13", balance: 100 },
      { date: "2024-06-14", balance: 80 },
      { date: "2024-06-15", balance: 80 },
      { date: "2024-06-16", balance: 80 },
    ]);

    expect(mockQueryRawTyped).toHaveBeenCalledOnce();
    expect(mockSqlFns.cashFlowByDay).toHaveBeenCalledWith(
      "user-1",
      new Date(
        `${dayjs().startOf("isoWeek").format("YYYY-MM-DD")}T00:00:00.000Z`,
      ),
    );
  });

  it("throws Unauthorized when no session", async () => {
    mockRequireUserId.mockRejectedValue(new Error("Unauthorized"));

    await expect(getCashFlow("weekly")).rejects.toThrow("Unauthorized");
    expect(mockQueryRawTyped).not.toHaveBeenCalled();
  });

  it("returns zero-filled series when no transactions", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));

    mockRequireUserId.mockResolvedValue("user-1");
    mockQueryRawTyped.mockResolvedValue([]);

    const result = await getCashFlow("weekly");

    expect(result).toHaveLength(7);
    expect(result.every((p) => p.balance === 0)).toBe(true);
  });

  it("fills date gaps with previous balance", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));

    mockRequireUserId.mockResolvedValue("user-1");
    mockQueryRawTyped.mockResolvedValue([
      { day: new Date("2024-06-10"), total: "50" },
      { day: new Date("2024-06-15"), total: "50" },
    ]);

    const result = await getCashFlow("weekly");

    expect(result).toEqual([
      { date: "2024-06-10", balance: 50 },
      { date: "2024-06-11", balance: 50 },
      { date: "2024-06-12", balance: 50 },
      { date: "2024-06-13", balance: 50 },
      { date: "2024-06-14", balance: 50 },
      { date: "2024-06-15", balance: 100 },
      { date: "2024-06-16", balance: 100 },
    ]);
  });

  it("propagates Prisma errors", async () => {
    mockRequireUserId.mockResolvedValue("user-1");
    const error = new Error("Database connection failed");
    mockQueryRawTyped.mockRejectedValue(error);

    await expect(getCashFlow("weekly")).rejects.toThrow(
      "Database connection failed",
    );
  });
});

describe("getRecentTransactions", () => {
  it("returns 5 most recent with mapped fields", async () => {
    mockRequireUserId.mockResolvedValue("user-1");

    mockFindMany.mockResolvedValue([
      {
        id: "txn-1",
        amount: new Prisma.Decimal(150),
        description: "Freelance payment",
        date: new Date("2024-06-15"),
        category: { name: "Salary" },
      },
      {
        id: "txn-2",
        amount: new Prisma.Decimal(-45),
        description: "Groceries",
        date: new Date("2024-06-14"),
        category: { name: "Food" },
      },
      {
        id: "txn-3",
        amount: new Prisma.Decimal(-30),
        description: null,
        date: new Date("2024-06-13"),
        category: { name: "Transport" },
      },
    ]);

    const result = await getRecentTransactions();

    expect(result).toEqual([
      {
        id: "txn-1",
        amount: 150,
        description: "Freelance payment",
        date: "2024-06-15",
        categoryName: "Salary",
      },
      {
        id: "txn-2",
        amount: -45,
        description: "Groceries",
        date: "2024-06-14",
        categoryName: "Food",
      },
      {
        id: "txn-3",
        amount: -30,
        description: null,
        date: "2024-06-13",
        categoryName: "Transport",
      },
    ]);

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
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
  });

  it("throws Unauthorized when no session", async () => {
    mockRequireUserId.mockRejectedValue(new Error("Unauthorized"));

    await expect(getRecentTransactions()).rejects.toThrow("Unauthorized");
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("returns empty array when no transactions", async () => {
    mockRequireUserId.mockResolvedValue("user-1");
    mockFindMany.mockResolvedValue([]);

    const result = await getRecentTransactions();

    expect(result).toEqual([]);
  });

  it("maps Decimal amount to number and formats date", async () => {
    mockRequireUserId.mockResolvedValue("user-1");
    mockFindMany.mockResolvedValue([
      {
        id: "txn-1",
        amount: new Prisma.Decimal(99.5),
        description: null,
        date: new Date("2024-06-15"),
        category: { name: "Food" },
      },
    ]);

    const result = await getRecentTransactions();

    expect(result[0].amount).toBe(99.5);
    expect(result[0].date).toBe("2024-06-15");
  });

  it("propagates Prisma errors", async () => {
    mockRequireUserId.mockResolvedValue("user-1");
    const error = new Error("Database connection failed");
    mockFindMany.mockRejectedValue(error);

    await expect(getRecentTransactions()).rejects.toThrow(
      "Database connection failed",
    );
  });
});
