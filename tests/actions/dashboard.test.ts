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

const { mockAuth, mockFindMany } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindMany: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: {
      findMany: mockFindMany,
    },
  },
}));

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

    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    const allData = [
      { amount: new Prisma.Decimal(200) },
      { amount: new Prisma.Decimal(-50) },
      { amount: new Prisma.Decimal(100) },
      { amount: new Prisma.Decimal(-30) },
      { amount: new Prisma.Decimal(75) },
    ];
    const weekData = [
      { amount: new Prisma.Decimal(100) },
      { amount: new Prisma.Decimal(-30) },
    ];
    const monthData = [
      { amount: new Prisma.Decimal(200) },
      { amount: new Prisma.Decimal(-50) },
      { amount: new Prisma.Decimal(100) },
      { amount: new Prisma.Decimal(-30) },
      { amount: new Prisma.Decimal(75) },
    ];

    mockFindMany
      .mockResolvedValueOnce(allData)
      .mockResolvedValueOnce(weekData)
      .mockResolvedValueOnce(monthData);

    const result = await getDashboardSummary();

    expect(result).toEqual({
      weekIncome: 100,
      weekExpense: -30,
      netBalance: 295,
      periodNetFlow: 295,
      periodLabel: "Monthly",
    });

    expect(mockFindMany).toHaveBeenNthCalledWith(1, {
      where: { userId: "user-1" },
      select: { amount: true },
    });
    const expectedWeekStart = dayjs().startOf("isoWeek").toDate();
    const expectedPeriodStart = dayjs().startOf("month").toDate();

    expect(mockFindMany).toHaveBeenNthCalledWith(2, {
      where: { userId: "user-1", date: { gte: expectedWeekStart } },
      select: { amount: true },
    });
    expect(mockFindMany).toHaveBeenNthCalledWith(3, {
      where: { userId: "user-1", date: { gte: expectedPeriodStart } },
      select: { amount: true },
    });
  });

  it("throws Unauthorized when no session", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(getDashboardSummary()).rejects.toThrow("Unauthorized");
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("returns zeros when no transactions exist", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindMany.mockResolvedValue([]);

    const result = await getDashboardSummary();

    expect(result).toEqual({
      weekIncome: 0,
      weekExpense: 0,
      netBalance: 0,
      periodNetFlow: 0,
      periodLabel: "Monthly",
    });
  });

  it("handles Prisma Decimal amounts correctly", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));

    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindMany
      .mockResolvedValueOnce([
        { amount: new Prisma.Decimal(42.5) },
        { amount: new Prisma.Decimal(-15.3) },
        { amount: new Prisma.Decimal(7.2) },
      ])
      .mockResolvedValueOnce([{ amount: new Prisma.Decimal(42.5) }])
      .mockResolvedValueOnce([
        { amount: new Prisma.Decimal(42.5) },
        { amount: new Prisma.Decimal(-15.3) },
        { amount: new Prisma.Decimal(7.2) },
      ]);

    const result = await getDashboardSummary();

    expect(result.weekIncome).toBe(42.5);
    expect(result.weekExpense).toBe(0);
    expect(result.netBalance).toBe(34.4);
    expect(result.periodNetFlow).toBe(34.4);
  });

  it("correctly filters week income and expense by sign", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));

    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { amount: new Prisma.Decimal(50) },
        { amount: new Prisma.Decimal(100) },
        { amount: new Prisma.Decimal(25) },
        { amount: new Prisma.Decimal(-10) },
        { amount: new Prisma.Decimal(-40) },
      ])
      .mockResolvedValueOnce([]);

    const result = await getDashboardSummary();

    expect(result.weekIncome).toBe(175);
    expect(result.weekExpense).toBe(-50);
  });

  it("propagates Prisma errors", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    const error = new Error("Database connection failed");
    mockFindMany.mockRejectedValue(error);

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

    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    mockFindMany.mockResolvedValue([
      { amount: new Prisma.Decimal(-50), category: { name: "Food" } },
      { amount: new Prisma.Decimal(-30), category: { name: "Transport" } },
      { amount: new Prisma.Decimal(-20), category: { name: "Food" } },
      { amount: new Prisma.Decimal(-100), category: { name: "Entertainment" } },
    ]);

    const result = await getExpensesByCategory("monthly");

    expect(result).toEqual([
      { categoryName: "Entertainment", total: -100 },
      { categoryName: "Food", total: -70 },
      { categoryName: "Transport", total: -30 },
    ]);

    const expectedStart = dayjs().startOf("month").toDate();
    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        date: { gte: expectedStart },
        amount: { lt: 0 },
      },
      select: { amount: true, category: { select: { name: true } } },
    });
  });

  it("throws Unauthorized when no session", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(getExpensesByCategory("monthly")).rejects.toThrow(
      "Unauthorized",
    );
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("returns empty array when no expenses", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindMany.mockResolvedValue([]);

    const result = await getExpensesByCategory("monthly");

    expect(result).toEqual([]);
  });

  it("uses default timeRange of month", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));

    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindMany.mockResolvedValue([]);

    await getExpensesByCategory();

    const expectedStart = dayjs().startOf("month").toDate();
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: { gte: expectedStart },
        }),
      }),
    );
  });

  it("propagates Prisma errors", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    const error = new Error("Database connection failed");
    mockFindMany.mockRejectedValue(error);

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

    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    mockFindMany.mockResolvedValue([
      { amount: new Prisma.Decimal(100), date: new Date("2024-06-12") },
      { amount: new Prisma.Decimal(-50), date: new Date("2024-06-14") },
      { amount: new Prisma.Decimal(30), date: new Date("2024-06-14") },
    ]);

    const result = await getCashFlow("weekly");

    expect(result).toEqual([
      { date: "2024-06-10", balance: 0, isFuture: false },
      { date: "2024-06-11", balance: 0, isFuture: false },
      { date: "2024-06-12", balance: 100, isFuture: false },
      { date: "2024-06-13", balance: 100, isFuture: false },
      { date: "2024-06-14", balance: 80, isFuture: false },
      { date: "2024-06-15", balance: 80, isFuture: false },
      { date: "2024-06-16", balance: 80, isFuture: true },
    ]);

    const expectedStart = dayjs().startOf("isoWeek").toDate();
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1", date: { gte: expectedStart } },
      orderBy: { date: "asc" },
      select: { amount: true, date: true },
    });
  });

  it("throws Unauthorized when no session", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(getCashFlow("weekly")).rejects.toThrow("Unauthorized");
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("returns zero-filled series when no transactions", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));

    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindMany.mockResolvedValue([]);

    const result = await getCashFlow("weekly");

    expect(result).toHaveLength(7);
    expect(result.every((p) => p.balance === 0)).toBe(true);
    expect(result.filter((p) => p.isFuture)).toHaveLength(1);
  });

  it("fills date gaps with previous balance", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));

    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindMany.mockResolvedValue([
      { amount: new Prisma.Decimal(50), date: new Date("2024-06-10") },
      { amount: new Prisma.Decimal(50), date: new Date("2024-06-15") },
    ]);

    const result = await getCashFlow("weekly");

    expect(result).toEqual([
      { date: "2024-06-10", balance: 50, isFuture: false },
      { date: "2024-06-11", balance: 50, isFuture: false },
      { date: "2024-06-12", balance: 50, isFuture: false },
      { date: "2024-06-13", balance: 50, isFuture: false },
      { date: "2024-06-14", balance: 50, isFuture: false },
      { date: "2024-06-15", balance: 100, isFuture: false },
      { date: "2024-06-16", balance: 100, isFuture: true },
    ]);
  });

  it("propagates Prisma errors", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    const error = new Error("Database connection failed");
    mockFindMany.mockRejectedValue(error);

    await expect(getCashFlow("weekly")).rejects.toThrow(
      "Database connection failed",
    );
  });
});

describe("getRecentTransactions", () => {
  it("returns 5 most recent with mapped fields", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

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
  });

  it("throws Unauthorized when no session", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(getRecentTransactions()).rejects.toThrow("Unauthorized");
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("returns empty array when no transactions", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindMany.mockResolvedValue([]);

    const result = await getRecentTransactions();

    expect(result).toEqual([]);
  });

  it("maps Decimal amount to number and formats date", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
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
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    const error = new Error("Database connection failed");
    mockFindMany.mockRejectedValue(error);

    await expect(getRecentTransactions()).rejects.toThrow(
      "Database connection failed",
    );
  });
});
