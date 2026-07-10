import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/actions/transactions";

const {
  mockAuth,
  mockFindMany,
  mockCreate,
  mockUpdate,
  mockDelete,
  mockRevalidatePath,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindMany: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockRevalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: {
      findMany: mockFindMany,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
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

describe("createTransaction", () => {
  const validData = {
    amount: 99.99,
    description: "Dinner",
    date: "2024-06-15",
    categoryId: "cat-1",
  };

  it("creates and returns a transaction for authenticated user", async () => {
    const created = {
      id: "txn-3",
      amount: 99.99,
      description: "Dinner",
      date: new Date("2024-06-15"),
      categoryId: "cat-1",
      userId: "user-1",
      category: { id: "cat-1", name: "Food" },
    };

    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockCreate.mockResolvedValue(created);

    const result = await createTransaction(validData);

    expect(result).toEqual({
      id: "txn-3",
      amount: 99.99,
      description: "Dinner",
      date: "2024-06-15",
      categoryId: "cat-1",
      category: { id: "cat-1", name: "Food" },
    });
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        amount: 99.99,
        description: "Dinner",
        date: expect.any(Date),
        userId: "user-1",
        categoryId: "cat-1",
      },
      include: { category: { select: { id: true, name: true } } },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/transactions");
  });

  it("throws Unauthorized when no session", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(createTransaction(validData)).rejects.toThrow("Unauthorized");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("throws Amount must be a non-zero number when amount is 0", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    await expect(
      createTransaction({ ...validData, amount: 0 }),
    ).rejects.toThrow("Amount must be a non-zero number");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("throws Amount must be a non-zero number when amount is NaN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    await expect(
      createTransaction({ ...validData, amount: NaN }),
    ).rejects.toThrow("Amount must be a non-zero number");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("throws Date is required when date is empty", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    await expect(createTransaction({ ...validData, date: "" })).rejects.toThrow(
      "Date is required",
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("throws Category is required when categoryId is empty", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    await expect(
      createTransaction({ ...validData, categoryId: "" }),
    ).rejects.toThrow("Category is required");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("propagates Prisma errors", async () => {
    const error = new Error("Unique constraint failed");
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockCreate.mockRejectedValue(error);

    await expect(createTransaction(validData)).rejects.toThrow(
      "Unique constraint failed",
    );
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateTransaction", () => {
  const txnId = "txn-1";
  const validData = {
    amount: 150.0,
    description: "Updated dinner",
    date: "2024-07-01",
    categoryId: "cat-2",
  };

  it("updates a transaction for authenticated user", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockUpdate.mockResolvedValue({});

    await updateTransaction(txnId, validData);

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: txnId, userId: "user-1" },
      data: {
        amount: 150.0,
        description: "Updated dinner",
        date: expect.any(Date),
        categoryId: "cat-2",
      },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/transactions");
  });

  it("throws Unauthorized when no session", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(updateTransaction(txnId, validData)).rejects.toThrow(
      "Unauthorized",
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("throws Amount must be a non-zero number when amount is 0", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    await expect(
      updateTransaction(txnId, { ...validData, amount: 0 }),
    ).rejects.toThrow("Amount must be a non-zero number");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("throws Amount must be a non-zero number when amount is NaN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    await expect(
      updateTransaction(txnId, { ...validData, amount: NaN }),
    ).rejects.toThrow("Amount must be a non-zero number");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("throws Date is required when date is empty", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    await expect(
      updateTransaction(txnId, { ...validData, date: "" }),
    ).rejects.toThrow("Date is required");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("throws Category is required when categoryId is empty", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    await expect(
      updateTransaction(txnId, { ...validData, categoryId: "" }),
    ).rejects.toThrow("Category is required");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("propagates Prisma errors (record not found)", async () => {
    const error = new Error("Record to update does not exist");
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockUpdate.mockRejectedValue(error);

    await expect(updateTransaction(txnId, validData)).rejects.toThrow(
      "Record to update does not exist",
    );
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});

describe("deleteTransaction", () => {
  it("deletes a transaction for authenticated user", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockDelete.mockResolvedValue({});

    await deleteTransaction("txn-1");

    expect(mockDelete).toHaveBeenCalledWith({
      where: { id: "txn-1", userId: "user-1" },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/transactions");
  });

  it("throws Unauthorized when no session", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(deleteTransaction("txn-1")).rejects.toThrow("Unauthorized");
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("propagates Prisma errors (record not found)", async () => {
    const error = new Error("Record to delete does not exist");
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockDelete.mockRejectedValue(error);

    await expect(deleteTransaction("nonexistent-id")).rejects.toThrow(
      "Record to delete does not exist",
    );
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});
