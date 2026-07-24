import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getDashboardSummary,
  getExpensesByCategory,
  getCashFlow,
  getRecentTransactions,
} from "@/actions/dashboard";
import {
  truncateAll,
  createUser,
  createCategory,
  expectDec,
  faker,
} from "./helpers";

dayjs.extend(isoWeek);

const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

const SCALE_ROWS = Number(process.env.SCALE_ROWS ?? 50_000);
const CATEGORY_COUNT = 20;
const BATCH_SIZE = 5_000;
// Catastrophic-regression guard only — CI runners vary wildly in speed.
const TIME_CEILING_MS = 15_000;

const D = Prisma.Decimal;

type Oracle = {
  netBalance: Prisma.Decimal;
  weekIncome: Prisma.Decimal;
  weekExpense: Prisma.Decimal;
  expensesByCategory: Record<string, Prisma.Decimal>;
};

let userId: string;
let oracle: Oracle;

beforeAll(async () => {
  // Freeze only Date so JS-side boundaries are deterministic; performance.now()
  // and pg driver timers stay real.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date());

  faker.seed(42);

  await truncateAll();

  const user = await createUser(faker.internet.email());
  userId = user.id;

  // Generate distinct realistic category names
  const categoryNames: string[] = [];
  const seen = new Set<string>();
  while (categoryNames.length < CATEGORY_COUNT) {
    const name = faker.commerce.department();
    if (!seen.has(name)) {
      seen.add(name);
      categoryNames.push(name);
    }
  }

  const categoryIds: string[] = [];
  const catNameByIndex = new Map<number, string>();
  for (let c = 0; c < CATEGORY_COUNT; c++) {
    const category = await createCategory(userId, categoryNames[c]);
    categoryIds.push(category.id);
    catNameByIndex.set(c, categoryNames[c]);
  }

  const monthStart = dayjs().startOf("month");
  const monthEnd = dayjs().endOf("month");
  const weekStartMs = dayjs().startOf("isoWeek").toDate().getTime();
  const frozenNow = dayjs().toDate();

  oracle = {
    netBalance: new D(0),
    weekIncome: new D(0),
    weekExpense: new D(0),
    expensesByCategory: {},
  };

  for (let batchStart = 0; batchStart < SCALE_ROWS; batchStart += BATCH_SIZE) {
    const batch = [];
    const batchEnd = Math.min(batchStart + BATCH_SIZE, SCALE_ROWS);
    for (let i = batchStart; i < batchEnd; i++) {
      const amount = faker.number.float({
        min: -2000,
        max: 3000,
        fractionDigits: 2,
      });
      const catIdx = faker.number.int({ min: 0, max: CATEGORY_COUNT - 1 });
      const catName = catNameByIndex.get(catIdx)!;
      const date = faker.date.between({
        from: monthStart.toDate(),
        to: monthEnd.toDate(),
      });
      const description =
        i % 7 === 0 ? faker.commerce.productName() : undefined;

      oracle.netBalance = oracle.netBalance.plus(amount);
      if (date.getTime() >= weekStartMs) {
        if (amount > 0) oracle.weekIncome = oracle.weekIncome.plus(amount);
        if (amount < 0) oracle.weekExpense = oracle.weekExpense.plus(amount);
      }
      if (amount < 0) {
        oracle.expensesByCategory[catName] = (
          oracle.expensesByCategory[catName] ?? new D(0)
        ).plus(amount);
      }

      batch.push({
        userId,
        categoryId: categoryIds[catIdx],
        amount,
        date,
        description,
        createdAt: frozenNow,
        updatedAt: frozenNow,
      });
    }
    await prisma.transaction.createMany({ data: batch });
  }

  mockAuth.mockResolvedValue({ user: { id: userId } });
}, 60_000);

afterAll(async () => {
  vi.useRealTimers();
  await truncateAll();
  await prisma.$disconnect();
});

describe("dashboard at scale", () => {
  it(
    "getDashboardSummary aggregates SCALE_ROWS rows correctly",
    { timeout: 30_000 },
    async () => {
      const start = performance.now();
      const result = await getDashboardSummary("monthly");
      const elapsed = performance.now() - start;

      expectDec(result.netBalance, oracle.netBalance);
      // Every seeded row is inside the current month
      expectDec(result.periodNetFlow, oracle.netBalance);
      expectDec(result.weekIncome, oracle.weekIncome);
      expectDec(result.weekExpense, oracle.weekExpense);
      expect(elapsed).toBeLessThan(TIME_CEILING_MS);
    },
  );

  it(
    "getExpensesByCategory groups SCALE_ROWS rows correctly",
    { timeout: 30_000 },
    async () => {
      const start = performance.now();
      const result = await getExpensesByCategory("monthly");
      const elapsed = performance.now() - start;

      expect(result).toHaveLength(CATEGORY_COUNT);
      // Compare per-category totals with exact Prisma.Decimal arithmetic
      for (const entry of result) {
        expectDec(entry.total, oracle.expensesByCategory[entry.categoryName]);
      }
      // ...plus a separate check that the array itself is sorted ascending
      const totals = result.map((r) => r.total);
      expect(totals).toEqual([...totals].sort((a, b) => a - b));
      expect(elapsed).toBeLessThan(TIME_CEILING_MS);
    },
  );

  it(
    "getCashFlow buckets SCALE_ROWS rows into the correct days",
    { timeout: 30_000 },
    async () => {
      const start = performance.now();
      const result = await getCashFlow("monthly");
      const elapsed = performance.now() - start;

      expect(result).toHaveLength(dayjs().daysInMonth());
      // All rows are in-month, so the series ends at the net balance
      expectDec(result[result.length - 1].balance, oracle.netBalance);
      expect(elapsed).toBeLessThan(TIME_CEILING_MS);
    },
  );

  it(
    "another user's small dataset is unaffected by SCALE_ROWS rows",
    { timeout: 30_000 },
    async () => {
      const userB = await createUser(faker.internet.email());
      const foodB = await createCategory(userB.id, "Food");
      await prisma.transaction.create({
        data: {
          userId: userB.id,
          categoryId: foodB.id,
          amount: -7,
          date: dayjs().toDate(),
          description: "B lunch",
        },
      });

      mockAuth.mockResolvedValue({ user: { id: userB.id } });

      const summary = await getDashboardSummary("monthly");
      expect(summary.netBalance).toBe(-7);

      const recent = await getRecentTransactions();
      expect(recent).toHaveLength(1);
      expect(recent[0].description).toBe("B lunch");

      mockAuth.mockResolvedValue({ user: { id: userId } });
    },
  );
});
