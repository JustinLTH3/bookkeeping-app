import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import {
  getDashboardSummary,
  getExpensesByCategory,
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
      { amount: 200 },
      { amount: -50 },
      { amount: 100 },
      { amount: -30 },
      { amount: 75 },
    ];
    const weekData = [{ amount: 100 }, { amount: -30 }];
    const monthData = [
      { amount: 200 },
      { amount: -50 },
      { amount: 100 },
      { amount: -30 },
      { amount: 75 },
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
      monthNetFlow: 295,
    });

    expect(mockFindMany).toHaveBeenNthCalledWith(1, {
      where: { userId: "user-1" },
      select: { amount: true },
    });
    const expectedWeekStart = dayjs().startOf("isoWeek").toDate();
    const expectedMonthStart = dayjs().startOf("month").toDate();

    expect(mockFindMany).toHaveBeenNthCalledWith(2, {
      where: { userId: "user-1", date: { gte: expectedWeekStart } },
      select: { amount: true },
    });
    expect(mockFindMany).toHaveBeenNthCalledWith(3, {
      where: { userId: "user-1", date: { gte: expectedMonthStart } },
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
      monthNetFlow: 0,
    });
  });

  it("handles Prisma Decimal amounts correctly", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));

    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindMany
      .mockResolvedValueOnce([
        { amount: { valueOf: () => 42.5 } },
        { amount: { valueOf: () => -15.3 } },
        { amount: { valueOf: () => 7.2 } },
      ])
      .mockResolvedValueOnce([{ amount: { valueOf: () => 42.5 } }])
      .mockResolvedValueOnce([
        { amount: { valueOf: () => 42.5 } },
        { amount: { valueOf: () => -15.3 } },
        { amount: { valueOf: () => 7.2 } },
      ]);

    const result = await getDashboardSummary();

    expect(result.weekIncome).toBe(42.5);
    expect(result.weekExpense).toBe(0);
    expect(result.netBalance).toBe(34.4);
    expect(result.monthNetFlow).toBe(34.4);
  });

  it("correctly filters week income and expense by sign", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));

    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { amount: 50 },
        { amount: 100 },
        { amount: 25 },
        { amount: -10 },
        { amount: -40 },
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
      { amount: -50, category: { name: "Food" } },
      { amount: -30, category: { name: "Transport" } },
      { amount: -20, category: { name: "Food" } },
      { amount: -100, category: { name: "Entertainment" } },
    ]);

    const result = await getExpensesByCategory("month");

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

    await expect(getExpensesByCategory("month")).rejects.toThrow(
      "Unauthorized",
    );
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("returns empty array when no expenses", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindMany.mockResolvedValue([]);

    const result = await getExpensesByCategory("month");

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

    await expect(getExpensesByCategory("month")).rejects.toThrow(
      "Database connection failed",
    );
  });
});
