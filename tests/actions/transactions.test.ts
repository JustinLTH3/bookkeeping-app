import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTransactions } from "@/actions/transactions";

const { mockAuth, mockFindMany, mockRevalidatePath } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindMany: vi.fn(),
  mockRevalidatePath: vi.fn(),
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

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getTransactions", () => {
  it("returns transactions for authenticated user ordered by date desc", async () => {
    const transactions = [
      {
        id: "txn-1",
        amount: 50.0,
        description: "Groceries",
        date: new Date("2024-06-15"),
        categoryId: "cat-1",
        userId: "user-1",
        category: { id: "cat-1", name: "Food" },
      },
      {
        id: "txn-2",
        amount: -25.0,
        description: "Bus fare",
        date: new Date("2024-06-10"),
        categoryId: "cat-2",
        userId: "user-1",
        category: { id: "cat-2", name: "Transport" },
      },
    ];

    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindMany.mockResolvedValue(transactions);

    const result = await getTransactions();

    expect(result).toEqual([
      {
        id: "txn-1",
        amount: 50,
        description: "Groceries",
        date: "2024-06-15",
        categoryId: "cat-1",
        category: { id: "cat-1", name: "Food" },
      },
      {
        id: "txn-2",
        amount: -25,
        description: "Bus fare",
        date: "2024-06-10",
        categoryId: "cat-2",
        category: { id: "cat-2", name: "Transport" },
      },
    ]);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { date: "desc" },
      include: { category: { select: { id: true, name: true } } },
    });
  });

  it("throws Unauthorized when no session", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(getTransactions()).rejects.toThrow("Unauthorized");
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("returns empty array when user has no transactions", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindMany.mockResolvedValue([]);

    const result = await getTransactions();

    expect(result).toEqual([]);
  });

  it("maps Prisma Decimal amount to number and formats date to YYYY-MM-DD", async () => {
    const prismaDecimal = { valueOf: () => 42.5 };

    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindMany.mockResolvedValue([
      {
        id: "txn-1",
        amount: prismaDecimal,
        description: null,
        date: new Date("2024-03-15"),
        categoryId: "cat-1",
        userId: "user-1",
        category: { id: "cat-1", name: "Food" },
      },
    ]);

    const result = await getTransactions();

    expect(result[0].amount).toBe(42.5);
    expect(result[0].date).toBe("2024-03-15");
  });
});
