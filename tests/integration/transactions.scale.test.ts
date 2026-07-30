import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import dayjs from "dayjs";
import { prisma } from "@/lib/prisma";
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/actions/transactions";
import {
  truncateAll,
  createUser,
  createCategory,
  faker,
} from "./helpers";

const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const SCALE_ROWS = Number(process.env.SCALE_ROWS ?? 50_000);
const CATEGORY_COUNT = 20;
const BATCH_SIZE = 5_000;
const TIME_CEILING_MS = 15_000;

let userId: string;
let categoryIds: string[];
let totalCount: number;
let knownDeleteId: string;
let knownUpdateId: string;

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date());

  faker.seed(42);
  await truncateAll();

  const user = await createUser(faker.internet.email());
  userId = user.id;

  const categoryNames: string[] = [];
  const seen = new Set<string>();
  while (categoryNames.length < CATEGORY_COUNT) {
    const name = faker.commerce.department();
    if (!seen.has(name)) {
      seen.add(name);
      categoryNames.push(name);
    }
  }

  categoryIds = [];
  for (let c = 0; c < CATEGORY_COUNT; c++) {
    const cat = await createCategory(userId, categoryNames[c]);
    categoryIds.push(cat.id);
  }

  const now = dayjs();
  const yearAgo = now.subtract(12, "month");

  for (let batchStart = 0; batchStart < SCALE_ROWS; batchStart += BATCH_SIZE) {
    const batch: Array<{
      userId: string;
      categoryId: string;
      amount: number;
      date: Date;
      description: string | null;
    }> = [];
    const batchEnd = Math.min(batchStart + BATCH_SIZE, SCALE_ROWS);

    for (let i = batchStart; i < batchEnd; i++) {
      const amount = faker.number.float({
        min: -2000,
        max: 3000,
        fractionDigits: 2,
      });
      const catIdx = faker.number.int({ min: 0, max: CATEGORY_COUNT - 1 });
      const date = faker.date.between({
        from: yearAgo.toDate(),
        to: now.toDate(),
      });
      const description =
        i % 7 === 0 ? faker.commerce.productName() : undefined;

      batch.push({
        userId,
        categoryId: categoryIds[catIdx],
        amount,
        date,
        description: description ?? null,
      });
    }
    await prisma.transaction.createMany({ data: batch });
  }

  mockAuth.mockResolvedValue({ user: { id: userId } });

  const updateTxn = await createTransaction({
    amount: -42.42,
    description: "UPDATE_ME",
    date: dayjs().format("YYYY-MM-DD"),
    categoryId: categoryIds[0],
  });
  knownUpdateId = updateTxn.id;

  const deleteTxn = await createTransaction({
    amount: -99.99,
    description: "DELETE_ME",
    date: dayjs().format("YYYY-MM-DD"),
    categoryId: categoryIds[1],
  });
  knownDeleteId = deleteTxn.id;

  totalCount = SCALE_ROWS + 2;
}, 60_000);

afterAll(async () => {
  vi.useRealTimers();
  await truncateAll();
  await prisma.$disconnect();
});

describe("transactions at scale", () => {
  it(
    "getTransactions returns correct totalCount",
    { timeout: 30_000 },
    async () => {
      const { totalCount: count } = await getTransactions(0, 10);
      expect(count).toBe(totalCount);
    },
  );

  it(
    "getTransactions first page returns items sorted by date desc with valid shape",
    { timeout: 30_000 },
    async () => {
      const { transactions, totalCount: count } = await getTransactions(0, 20);
      expect(count).toBe(totalCount);
      expect(transactions).toHaveLength(20);

      for (const t of transactions) {
        expect(t.id).toBeTruthy();
        expect(typeof t.amount).toBe("number");
        expect(t.amount).not.toBe(0);
        expect(t.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(t.categoryId).toBeTruthy();
        expect(t.category).toHaveProperty("id");
        expect(t.category).toHaveProperty("name");
      }

      for (let i = 1; i < transactions.length; i++) {
        expect(
          transactions[i].date.localeCompare(transactions[i - 1].date),
        ).toBeLessThanOrEqual(0);
      }
    },
  );

  it(
    "getTransactions first page is performant",
    { timeout: 30_000 },
    async () => {
      const start = performance.now();
      await getTransactions(0, 10);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(TIME_CEILING_MS);
    },
  );

  it(
    "getTransactions with large offset is performant",
    { timeout: 30_000 },
    async () => {
      const largeOffset = Math.max(0, totalCount - 10);
      const start = performance.now();
      const { transactions } = await getTransactions(largeOffset, 10);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(TIME_CEILING_MS);
      expect(transactions.length).toBeGreaterThan(0);
    },
  );

  it(
    "getTransactions second page does not overlap with first",
    { timeout: 30_000 },
    async () => {
      const page1 = await getTransactions(0, 10);
      const page2 = await getTransactions(10, 10);
      expect(page1.transactions).toHaveLength(10);
      expect(page2.transactions).toHaveLength(10);
      const page1Ids = new Set(page1.transactions.map((t) => t.id));
      for (const t of page2.transactions) {
        expect(page1Ids.has(t.id)).toBe(false);
      }
    },
  );

  it(
    "createTransaction inserts into large dataset correctly",
    { timeout: 30_000 },
    async () => {
      const before = await getTransactions(0, 1);
      const beforeCount = before.totalCount;

      const result = await createTransaction({
        amount: 1234.56,
        description: "Scale test insert",
        date: dayjs().format("YYYY-MM-DD"),
        categoryId: categoryIds[0],
      });

      expect(result.amount).toBe(1234.56);
      expect(result.description).toBe("Scale test insert");

      const after = await getTransactions(0, 1);
      expect(after.totalCount).toBe(beforeCount + 1);
    },
  );

  it(
    "createTransaction validates amount at scale (0 throws)",
    { timeout: 30_000 },
    async () => {
      await expect(
        createTransaction({
          amount: 0,
          description: null,
          date: dayjs().format("YYYY-MM-DD"),
          categoryId: categoryIds[0],
        }),
      ).rejects.toThrow("Amount must be a non-zero number");
    },
  );

  it(
    "updateTransaction updates owned transaction in large dataset",
    { timeout: 30_000 },
    async () => {
      await updateTransaction(knownUpdateId, {
        amount: 777.77,
        description: "UPDATED",
        date: dayjs().format("YYYY-MM-DD"),
        categoryId: categoryIds[2],
      });

      const stored = await prisma.transaction.findUnique({
        where: { id: knownUpdateId },
      });
      expect(stored).toBeTruthy();
      expect(Number(stored!.amount)).toBe(777.77);
      expect(stored!.description).toBe("UPDATED");
      expect(stored!.categoryId).toBe(categoryIds[2]);
    },
  );

  it(
    "updateTransaction rejects cross-tenant update at scale",
    { timeout: 30_000 },
    async () => {
      const userB = await createUser(faker.internet.email());
      mockAuth.mockResolvedValue({ user: { id: userB.id } });

      await expect(
        updateTransaction(knownUpdateId, {
          amount: 999,
          description: "stolen",
          date: dayjs().format("YYYY-MM-DD"),
          categoryId: categoryIds[0],
        }),
      ).rejects.toThrow();

      mockAuth.mockResolvedValue({ user: { id: userId } });
    },
  );

  it(
    "deleteTransaction removes owned transaction from large dataset",
    { timeout: 30_000 },
    async () => {
      const before = await getTransactions(0, 1);
      await deleteTransaction(knownDeleteId);

      const gone = await prisma.transaction.findUnique({
        where: { id: knownDeleteId },
      });
      expect(gone).toBeNull();

      const after = await getTransactions(0, 1);
      expect(after.totalCount).toBe(before.totalCount - 1);
    },
  );

  it(
    "deleteTransaction rejects cross-tenant delete at scale",
    { timeout: 30_000 },
    async () => {
      const userC = await createUser(faker.internet.email());

      const { transactions } = await getTransactions(0, 1);
      expect(transactions.length).toBeGreaterThan(0);
      const someId = transactions[0].id;

      mockAuth.mockResolvedValue({ user: { id: userC.id } });
      await expect(deleteTransaction(someId)).rejects.toThrow();

      const stillHere = await prisma.transaction.findUnique({
        where: { id: someId },
      });
      expect(stillHere).toBeTruthy();

      mockAuth.mockResolvedValue({ user: { id: userId } });
    },
  );

  it(
    "multi-tenancy isolation — other user sees 0 transactions despite scale dataset",
    { timeout: 30_000 },
    async () => {
      const userD = await createUser(faker.internet.email());
      mockAuth.mockResolvedValue({ user: { id: userD.id } });

      const { transactions, totalCount: count } = await getTransactions(0, 10);
      expect(transactions).toHaveLength(0);
      expect(count).toBe(0);

      mockAuth.mockResolvedValue({ user: { id: userId } });
    },
  );
});
