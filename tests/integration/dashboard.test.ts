import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { prisma } from "@/lib/prisma";
import {
  getDashboardSummary,
  getExpensesByCategory,
  getCashFlow,
  getRecentTransactions,
  getDashboardData,
} from "@/actions/dashboard";

dayjs.extend(isoWeek);

const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

async function truncateAll() {
  await prisma.$executeRaw`TRUNCATE TABLE "Transaction", "Category", "User" CASCADE`;
}

function createUser(email: string) {
  return prisma.user.create({ data: { email, name: email } });
}

function createCategory(userId: string, name: string) {
  return prisma.category.create({ data: { userId, name } });
}

function createTransaction(
  userId: string,
  categoryId: string,
  amount: number,
  date: Date,
  description?: string,
) {
  return prisma.transaction.create({
    data: { userId, categoryId, amount, date, description },
  });
}

function asUser(id: string) {
  mockAuth.mockResolvedValue({ user: { id } });
}

beforeEach(async () => {
  mockAuth.mockReset();
  await truncateAll();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("getDashboardSummary", () => {
  it("aggregates week totals and net balance from real rows", async () => {
    const user = await createUser("a@test.com");
    const food = await createCategory(user.id, "Food");
    const salary = await createCategory(user.id, "Salary");

    const weekStart = dayjs().startOf("isoWeek");
    // Inside this week
    await createTransaction(user.id, salary.id, 1000, dayjs().toDate());
    await createTransaction(user.id, food.id, -50.25, weekStart.toDate());
    // Before this week: excluded from week totals, still in net balance
    await createTransaction(
      user.id,
      food.id,
      -200,
      weekStart.subtract(1, "day").toDate(),
    );

    asUser(user.id);
    const result = await getDashboardSummary("monthly");

    expect(result.weekIncome).toBeCloseTo(1000);
    expect(result.weekExpense).toBeCloseTo(-50.25);
    expect(result.netBalance).toBeCloseTo(749.75);
    expect(result.periodLabel).toBe("Monthly");
  });

  it("applies the monthly period filter at the month boundary", async () => {
    const user = await createUser("a@test.com");
    const salary = await createCategory(user.id, "Salary");

    const monthStart = dayjs().startOf("month");
    await createTransaction(user.id, salary.id, 500, monthStart.toDate());
    await createTransaction(
      user.id,
      salary.id,
      -999,
      monthStart.subtract(1, "day").toDate(),
    );

    asUser(user.id);
    const result = await getDashboardSummary("monthly");

    expect(result.periodNetFlow).toBeCloseTo(500);
    expect(result.netBalance).toBeCloseTo(-499);
  });

  it("applies the yearly period filter at the year boundary", async () => {
    const user = await createUser("a@test.com");
    const salary = await createCategory(user.id, "Salary");

    const yearStart = dayjs().startOf("year");
    await createTransaction(user.id, salary.id, 1200, yearStart.toDate());
    await createTransaction(
      user.id,
      salary.id,
      -300,
      yearStart.subtract(1, "day").toDate(),
    );

    asUser(user.id);
    const result = await getDashboardSummary("yearly");

    expect(result.periodNetFlow).toBeCloseTo(1200);
    expect(result.netBalance).toBeCloseTo(900);
  });

  it("returns zeros when the user has no transactions", async () => {
    const user = await createUser("a@test.com");

    asUser(user.id);
    const result = await getDashboardSummary("monthly");

    expect(result).toEqual({
      weekIncome: 0,
      weekExpense: 0,
      netBalance: 0,
      periodNetFlow: 0,
      periodLabel: "Monthly",
    });
  });
});

describe("getExpensesByCategory", () => {
  it("groups expenses by category, excluding income and out-of-range rows", async () => {
    const user = await createUser("a@test.com");
    const food = await createCategory(user.id, "Food");
    const transport = await createCategory(user.id, "Transport");
    const salary = await createCategory(user.id, "Salary");

    const now = dayjs().toDate();
    await createTransaction(user.id, food.id, -50, now);
    await createTransaction(user.id, food.id, -20.5, now);
    await createTransaction(user.id, transport.id, -100, now);
    // Income: excluded from expense breakdown
    await createTransaction(user.id, salary.id, 3000, now);
    // Before this month: excluded from the monthly range
    await createTransaction(
      user.id,
      food.id,
      -999,
      dayjs().startOf("month").subtract(1, "day").toDate(),
    );

    asUser(user.id);
    const result = await getExpensesByCategory("monthly");

    expect(result).toEqual([
      { categoryName: "Transport", total: -100 },
      { categoryName: "Food", total: -70.5 },
    ]);
  });

  it("returns an empty array when there are no expenses in range", async () => {
    const user = await createUser("a@test.com");
    const salary = await createCategory(user.id, "Salary");
    await createTransaction(user.id, salary.id, 3000, dayjs().toDate());

    asUser(user.id);
    const result = await getExpensesByCategory("monthly");

    expect(result).toEqual([]);
  });
});

describe("getCashFlow", () => {
  it("builds a cumulative daily series across the current week", async () => {
    const user = await createUser("a@test.com");
    const food = await createCategory(user.id, "Food");
    const salary = await createCategory(user.id, "Salary");

    const weekStart = dayjs().startOf("isoWeek");
    await createTransaction(user.id, salary.id, 100, weekStart.toDate());
    await createTransaction(
      user.id,
      food.id,
      -30,
      weekStart.add(2, "day").toDate(),
    );

    asUser(user.id);
    const result = await getCashFlow("weekly");

    expect(result).toHaveLength(7);
    expect(result[0]).toEqual({
      date: weekStart.format("YYYY-MM-DD"),
      balance: 100,
    });
    expect(result[1].balance).toBe(100);
    expect(result[2].balance).toBe(70);
    expect(result[6].balance).toBe(70);
  });

  it("returns a zero-filled week when there are no transactions", async () => {
    const user = await createUser("a@test.com");

    asUser(user.id);
    const result = await getCashFlow("weekly");

    expect(result).toHaveLength(7);
    expect(result.every((p) => p.balance === 0)).toBe(true);
  });
});

describe("getRecentTransactions", () => {
  it("returns the 5 most recent transactions with mapped fields", async () => {
    const user = await createUser("a@test.com");
    const food = await createCategory(user.id, "Food");

    for (let i = 0; i <= 5; i++) {
      await createTransaction(
        user.id,
        food.id,
        -(i + 1) * 10,
        dayjs().subtract(i, "day").toDate(),
        `txn ${i}`,
      );
    }

    asUser(user.id);
    const result = await getRecentTransactions();

    expect(result).toHaveLength(5);
    expect(result.map((t) => t.description)).toEqual([
      "txn 0",
      "txn 1",
      "txn 2",
      "txn 3",
      "txn 4",
    ]);
    expect(result[0].categoryName).toBe("Food");
    expect(result[0].amount).toBe(-10);
    expect(result[0].date).toBe(dayjs().format("YYYY-MM-DD"));
    expect(result[1].date).toBe(
      dayjs().subtract(1, "day").format("YYYY-MM-DD"),
    );
  });

  it("returns an empty array when the user has no transactions", async () => {
    const user = await createUser("a@test.com");

    asUser(user.id);
    const result = await getRecentTransactions();

    expect(result).toEqual([]);
  });
});

describe("getDashboardData", () => {
  it("returns all dashboard sections in a single call", async () => {
    const user = await createUser("a@test.com");
    const food = await createCategory(user.id, "Food");
    const salary = await createCategory(user.id, "Salary");

    const now = dayjs().toDate();
    await createTransaction(user.id, salary.id, 800, now, "Paycheck");
    await createTransaction(user.id, food.id, -45.5, now, "Groceries");

    asUser(user.id);
    const result = await getDashboardData("weekly");

    expect(result.summary.periodLabel).toBe("Weekly");
    expect(result.summary.netBalance).toBeCloseTo(754.5);
    expect(result.expensesByCategory).toEqual([
      { categoryName: "Food", total: -45.5 },
    ]);
    expect(result.cashFlow).toHaveLength(7);
    expect(result.cashFlow[6].balance).toBeCloseTo(754.5);
    expect(result.recentTransactions).toHaveLength(2);
  });
});

describe("multi-tenancy", () => {
  it("excludes other users' data from every dashboard query", async () => {
    const userA = await createUser("a@test.com");
    const userB = await createUser("b@test.com");
    // Identical category names on both users to exercise join scoping
    const foodA = await createCategory(userA.id, "Food");
    const foodB = await createCategory(userB.id, "Food");

    const now = dayjs().toDate();
    await createTransaction(userA.id, foodA.id, -40, now, "A lunch");
    await createTransaction(userB.id, foodB.id, -5000, now, "B splurge");
    await createTransaction(userB.id, foodB.id, 9000, now, "B paycheck");

    asUser(userA.id);

    const summary = await getDashboardSummary("monthly");
    expect(summary.netBalance).toBeCloseTo(-40);
    expect(summary.weekExpense).toBeCloseTo(-40);
    expect(summary.weekIncome).toBeCloseTo(0);

    const expenses = await getExpensesByCategory("monthly");
    expect(expenses).toEqual([{ categoryName: "Food", total: -40 }]);

    const cashFlow = await getCashFlow("weekly");
    expect(cashFlow[6].balance).toBe(-40);

    const recent = await getRecentTransactions();
    expect(recent).toHaveLength(1);
    expect(recent[0].description).toBe("A lunch");
  });
});
