import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
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
  expectDec,
  faker,
} from "./helpers";

const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

function asUser(id: string) {
  mockAuth.mockResolvedValue({ user: { id } });
}

beforeEach(async () => {
  faker.seed(123);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date());
  mockAuth.mockReset();
  await truncateAll();
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("createTransaction", () => {
  it("creates and returns a transaction with category relation", async () => {
    const user = await createUser(faker.internet.email());
    const food = await createCategory(user.id, "Food");

    asUser(user.id);
    const result = await createTransaction({
      amount: 99.99,
      description: "Dinner",
      date: dayjs().format("YYYY-MM-DD"),
      categoryId: food.id,
    });

    expect(result.id).toBeTruthy();
    expect(result.amount).toBe(99.99);
    expect(result.description).toBe("Dinner");
    expect(result.date).toBe(dayjs().format("YYYY-MM-DD"));
    expect(result.categoryId).toBe(food.id);
    expect(result.category).toEqual({ id: food.id, name: "Food" });

    const stored = await prisma.transaction.findUnique({
      where: { id: result.id },
    });
    expect(stored).toBeTruthy();
    expect(stored!.description).toBe("Dinner");
    expectDec(Number(stored!.amount), 99.99);
  });

  it("handles negative amounts for expenses", async () => {
    const user = await createUser(faker.internet.email());
    const food = await createCategory(user.id, "Food");

    asUser(user.id);
    const result = await createTransaction({
      amount: -150.75,
      description: "Rent",
      date: dayjs().format("YYYY-MM-DD"),
      categoryId: food.id,
    });

    expect(result.amount).toBe(-150.75);

    const stored = await prisma.transaction.findUnique({
      where: { id: result.id },
    });
    expectDec(Number(stored!.amount), -150.75);
  });

  it("handles null description", async () => {
    const user = await createUser(faker.internet.email());
    const food = await createCategory(user.id, "Food");

    asUser(user.id);
    const result = await createTransaction({
      amount: 50,
      description: null,
      date: dayjs().format("YYYY-MM-DD"),
      categoryId: food.id,
    });

    expect(result.description).toBeNull();

    const stored = await prisma.transaction.findUnique({
      where: { id: result.id },
    });
    expect(stored!.description).toBeNull();
  });

  it("persists updatedAt on creation", async () => {
    const user = await createUser(faker.internet.email());
    const food = await createCategory(user.id, "Food");

    asUser(user.id);
    const result = await createTransaction({
      amount: 100,
      description: null,
      date: dayjs().format("YYYY-MM-DD"),
      categoryId: food.id,
    });

    const stored = await prisma.transaction.findUnique({
      where: { id: result.id },
    });
    expect(stored!.createdAt).toBeTruthy();
    expect(stored!.updatedAt).toBeTruthy();
  });

  it("throws Unauthorized when no session", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(
      createTransaction({
        amount: 99.99,
        description: null,
        date: dayjs().format("YYYY-MM-DD"),
        categoryId: "any-category",
      }),
    ).rejects.toThrow("Unauthorized");
  });

  it("throws when amount is 0", async () => {
    const user = await createUser(faker.internet.email());
    const food = await createCategory(user.id, "Food");

    asUser(user.id);
    await expect(
      createTransaction({
        amount: 0,
        description: null,
        date: dayjs().format("YYYY-MM-DD"),
        categoryId: food.id,
      }),
    ).rejects.toThrow("Amount must be a non-zero number");
  });

  it("throws when amount is NaN", async () => {
    const user = await createUser(faker.internet.email());
    const food = await createCategory(user.id, "Food");

    asUser(user.id);
    await expect(
      createTransaction({
        amount: NaN,
        description: null,
        date: dayjs().format("YYYY-MM-DD"),
        categoryId: food.id,
      }),
    ).rejects.toThrow("Amount must be a non-zero number");
  });

  it("throws when date is empty", async () => {
    const user = await createUser(faker.internet.email());
    const food = await createCategory(user.id, "Food");

    asUser(user.id);
    await expect(
      createTransaction({
        amount: 100,
        description: null,
        date: "",
        categoryId: food.id,
      }),
    ).rejects.toThrow("Date is required");
  });

  it("throws when categoryId is empty", async () => {
    const user = await createUser(faker.internet.email());

    asUser(user.id);
    await expect(
      createTransaction({
        amount: 100,
        description: null,
        date: dayjs().format("YYYY-MM-DD"),
        categoryId: "",
      }),
    ).rejects.toThrow("Category is required");
  });

  it("handles extreme Decimal precision", async () => {
    const user = await createUser(faker.internet.email());
    const cat = await createCategory(user.id, "Salary");

    asUser(user.id);
    await createTransaction({
      amount: 9999999999.99,
      description: null,
      date: dayjs().format("YYYY-MM-DD"),
      categoryId: cat.id,
    });
    await createTransaction({
      amount: 0.01,
      description: null,
      date: dayjs().format("YYYY-MM-DD"),
      categoryId: cat.id,
    });

    const { transactions: allTxns } = await getTransactions();
    const sum = allTxns.reduce((acc, t) => acc + t.amount, 0);
    expectDec(sum, 10000000000);
  });
});

describe("getTransactions", () => {
  it("returns transactions for authenticated user ordered by date desc", async () => {
    const user = await createUser(faker.internet.email());
    const food = await createCategory(user.id, "Food");
    const transport = await createCategory(user.id, "Transport");

    asUser(user.id);
    await createTransaction({
      amount: -25,
      description: "Bus fare",
      date: dayjs().subtract(2, "day").format("YYYY-MM-DD"),
      categoryId: transport.id,
    });
    await createTransaction({
      amount: -50.25,
      description: "Groceries",
      date: dayjs().subtract(1, "day").format("YYYY-MM-DD"),
      categoryId: food.id,
    });
    await createTransaction({
      amount: 1000,
      description: "Salary",
      date: dayjs().format("YYYY-MM-DD"),
      categoryId: food.id,
    });

    const { transactions: result } = await getTransactions();

    expect(result).toHaveLength(3);
    expect(result[0].amount).toBe(1000);
    expect(result[0].description).toBe("Salary");
    expect(result[0].date).toBe(dayjs().format("YYYY-MM-DD"));
    expect(result[0].categoryId).toBe(food.id);
    expect(result[0].category).toEqual({ id: food.id, name: "Food" });

    expect(result[1].amount).toBe(-50.25);
    expect(result[1].date).toBe(
      dayjs().subtract(1, "day").format("YYYY-MM-DD"),
    );

    expect(result[2].amount).toBe(-25);
    expect(result[2].date).toBe(
      dayjs().subtract(2, "day").format("YYYY-MM-DD"),
    );
  });

  it("returns an empty array when user has no transactions", async () => {
    const user = await createUser(faker.internet.email());

    asUser(user.id);
    const { transactions: result } = await getTransactions();

    expect(result).toEqual([]);
  });

  it("excludes other users' transactions", async () => {
    const userA = await createUser(faker.internet.email());
    const userB = await createUser(faker.internet.email());
    const foodA = await createCategory(userA.id, "Food");
    const foodB = await createCategory(userB.id, "Food");

    asUser(userA.id);
    await createTransaction({
      amount: -40,
      description: "A lunch",
      date: dayjs().format("YYYY-MM-DD"),
      categoryId: foodA.id,
    });
    asUser(userB.id);
    await createTransaction({
      amount: -5000,
      description: "B splurge",
      date: dayjs().format("YYYY-MM-DD"),
      categoryId: foodB.id,
    });

    asUser(userA.id);
    const { transactions: result } = await getTransactions();

    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("A lunch");
    expect(result[0].amount).toBe(-40);
  });

  it("maps Decimal amount to number", async () => {
    const user = await createUser(faker.internet.email());
    const cat = await createCategory(user.id, "Food");

    asUser(user.id);
    await createTransaction({
      amount: 9999999999.99,
      description: null,
      date: dayjs().subtract(1, "day").format("YYYY-MM-DD"),
      categoryId: cat.id,
    });
    await createTransaction({
      amount: 0.01,
      description: null,
      date: dayjs().format("YYYY-MM-DD"),
      categoryId: cat.id,
    });

    const { transactions: result } = await getTransactions();

    expect(result[0].amount).toBe(0.01);
    expect(result[1].amount).toBe(9999999999.99);
  });

  it("throws Unauthorized when no session", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(getTransactions()).rejects.toThrow("Unauthorized");
  });
});

describe("updateTransaction", () => {
  it("updates all fields on an owned transaction", async () => {
    const user = await createUser(faker.internet.email());
    const food = await createCategory(user.id, "Food");
    const transport = await createCategory(user.id, "Transport");

    asUser(user.id);
    const txn = await createTransaction({
      amount: -50,
      description: "Old desc",
      date: dayjs().subtract(3, "day").format("YYYY-MM-DD"),
      categoryId: food.id,
    });

    await updateTransaction(txn.id, {
      amount: 200,
      description: "Updated",
      date: dayjs().format("YYYY-MM-DD"),
      categoryId: transport.id,
    });

    const updated = await prisma.transaction.findUnique({
      where: { id: txn.id },
    });
    expect(updated).toBeTruthy();
    expectDec(Number(updated!.amount), 200);
    expect(updated!.description).toBe("Updated");
    expect(dayjs(updated!.date).format("YYYY-MM-DD")).toBe(
      dayjs().format("YYYY-MM-DD"),
    );
    expect(updated!.categoryId).toBe(transport.id);
  });

  it("cannot update another user's transaction", async () => {
    const userA = await createUser(faker.internet.email());
    const userB = await createUser(faker.internet.email());
    const catA = await createCategory(userA.id, "Food");
    const catB = await createCategory(userB.id, "Food");

    asUser(userA.id);
    const txn = await createTransaction({
      amount: -50,
      description: null,
      date: dayjs().format("YYYY-MM-DD"),
      categoryId: catA.id,
    });

    asUser(userB.id);
    await expect(
      updateTransaction(txn.id, {
        amount: 999,
        description: "stolen",
        date: dayjs().format("YYYY-MM-DD"),
        categoryId: catB.id,
      }),
    ).rejects.toThrow();

    const untouched = await prisma.transaction.findUnique({
      where: { id: txn.id },
    });
    expectDec(Number(untouched!.amount), -50);
    expect(untouched!.categoryId).toBe(catA.id);
  });

  it("cannot update a non-existent transaction", async () => {
    const user = await createUser(faker.internet.email());
    const cat = await createCategory(user.id, "Food");

    asUser(user.id);
    await expect(
      updateTransaction("00000000-0000-0000-0000-000000000000", {
        amount: 100,
        description: null,
        date: dayjs().format("YYYY-MM-DD"),
        categoryId: cat.id,
      }),
    ).rejects.toThrow();
  });

  it("updates description to null", async () => {
    const user = await createUser(faker.internet.email());
    const food = await createCategory(user.id, "Food");

    asUser(user.id);
    const txn = await createTransaction({
      amount: -50,
      description: "Has description",
      date: dayjs().format("YYYY-MM-DD"),
      categoryId: food.id,
    });

    await updateTransaction(txn.id, {
      amount: -50,
      description: null,
      date: dayjs().format("YYYY-MM-DD"),
      categoryId: food.id,
    });

    const updated = await prisma.transaction.findUnique({
      where: { id: txn.id },
    });
    expect(updated!.description).toBeNull();
  });

  it("throws Unauthorized when no session", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(
      updateTransaction("any-id", {
        amount: 100,
        description: null,
        date: dayjs().format("YYYY-MM-DD"),
        categoryId: "any-category",
      }),
    ).rejects.toThrow("Unauthorized");
  });

  it("throws when amount is 0", async () => {
    const user = await createUser(faker.internet.email());
    const cat = await createCategory(user.id, "Food");

    asUser(user.id);
    await expect(
      updateTransaction("any-id", {
        amount: 0,
        description: null,
        date: dayjs().format("YYYY-MM-DD"),
        categoryId: cat.id,
      }),
    ).rejects.toThrow("Amount must be a non-zero number");
  });

  it("throws when amount is NaN", async () => {
    const user = await createUser(faker.internet.email());
    const cat = await createCategory(user.id, "Food");

    asUser(user.id);
    await expect(
      updateTransaction("any-id", {
        amount: NaN,
        description: null,
        date: dayjs().format("YYYY-MM-DD"),
        categoryId: cat.id,
      }),
    ).rejects.toThrow("Amount must be a non-zero number");
  });

  it("throws when date is empty", async () => {
    const user = await createUser(faker.internet.email());
    const cat = await createCategory(user.id, "Food");

    asUser(user.id);
    await expect(
      updateTransaction("any-id", {
        amount: 100,
        description: null,
        date: "",
        categoryId: cat.id,
      }),
    ).rejects.toThrow("Date is required");
  });

  it("throws when categoryId is empty", async () => {
    const user = await createUser(faker.internet.email());

    asUser(user.id);
    await expect(
      updateTransaction("any-id", {
        amount: 100,
        description: null,
        date: dayjs().format("YYYY-MM-DD"),
        categoryId: "",
      }),
    ).rejects.toThrow("Category is required");
  });
});

describe("deleteTransaction", () => {
  it("deletes an owned transaction from the database", async () => {
    const user = await createUser(faker.internet.email());
    const food = await createCategory(user.id, "Food");

    asUser(user.id);
    const txn = await createTransaction({
      amount: -50,
      description: "To delete",
      date: dayjs().format("YYYY-MM-DD"),
      categoryId: food.id,
    });

    await deleteTransaction(txn.id);

    const gone = await prisma.transaction.findUnique({
      where: { id: txn.id },
    });
    expect(gone).toBeNull();
  });

  it("cannot delete another user's transaction", async () => {
    const userA = await createUser(faker.internet.email());
    const userB = await createUser(faker.internet.email());
    const catA = await createCategory(userA.id, "Food");

    asUser(userA.id);
    const txn = await createTransaction({
      amount: -50,
      description: null,
      date: dayjs().format("YYYY-MM-DD"),
      categoryId: catA.id,
    });

    asUser(userB.id);
    await expect(deleteTransaction(txn.id)).rejects.toThrow();

    const stillHere = await prisma.transaction.findUnique({
      where: { id: txn.id },
    });
    expect(stillHere).toBeTruthy();
  });

  it("cannot delete a non-existent transaction", async () => {
    const user = await createUser(faker.internet.email());

    asUser(user.id);
    await expect(
      deleteTransaction("00000000-0000-0000-0000-000000000000"),
    ).rejects.toThrow();
  });

  it("throws Unauthorized when no session", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(deleteTransaction("any-id")).rejects.toThrow("Unauthorized");
  });

  it("deleting does not affect other users' transactions", async () => {
    const userA = await createUser(faker.internet.email());
    const userB = await createUser(faker.internet.email());
    const catA = await createCategory(userA.id, "Food");
    const catB = await createCategory(userB.id, "Food");

    asUser(userA.id);
    const txnA = await createTransaction({
      amount: -50,
      description: null,
      date: dayjs().format("YYYY-MM-DD"),
      categoryId: catA.id,
    });
    asUser(userB.id);
    const txnB = await createTransaction({
      amount: -100,
      description: null,
      date: dayjs().format("YYYY-MM-DD"),
      categoryId: catB.id,
    });

    asUser(userA.id);
    await deleteTransaction(txnA.id);

    const gone = await prisma.transaction.findUnique({
      where: { id: txnA.id },
    });
    expect(gone).toBeNull();

    const stillHere = await prisma.transaction.findUnique({
      where: { id: txnB.id },
    });
    expect(stillHere).toBeTruthy();
  });
});

describe("foreign key constraints", () => {
  it("rejects creating a transaction with a non-existent categoryId", async () => {
    const user = await createUser(faker.internet.email());

    asUser(user.id);
    await expect(
      createTransaction({
        amount: 100,
        description: null,
        date: dayjs().format("YYYY-MM-DD"),
        categoryId: "00000000-0000-0000-0000-000000000000",
      }),
    ).rejects.toThrow();
  });

  it("rejects creating a transaction with a non-existent userId", async () => {
    const cat = await createCategory(
      (await createUser(faker.internet.email())).id,
      "Food",
    );

    mockAuth.mockResolvedValue({
      user: { id: "00000000-0000-0000-0000-000000000000" },
    });

    await expect(
      createTransaction({
        amount: 100,
        description: null,
        date: dayjs().format("YYYY-MM-DD"),
        categoryId: cat.id,
      }),
    ).rejects.toThrow();
  });
});
