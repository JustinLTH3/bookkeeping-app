import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCategories,
  createCategory,
  deleteCategory,
  renameCategory,
} from "@/actions/categories";

const {
  mockAuth,
  mockFindMany,
  mockCreate,
  mockDelete,
  mockUpdate,
  mockRevalidatePath,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindMany: vi.fn(),
  mockCreate: vi.fn(),
  mockDelete: vi.fn(),
  mockUpdate: vi.fn(),
  mockRevalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    category: {
      findMany: mockFindMany,
      create: mockCreate,
      delete: mockDelete,
      update: mockUpdate,
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCategories", () => {
  it("returns categories for authenticated user ordered by createdAt desc", async () => {
    const categories = [
      { id: "cat-1", name: "Food" },
      { id: "cat-2", name: "Transport" },
    ];
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindMany.mockResolvedValue(categories);

    const result = await getCategories();

    expect(result).toEqual(categories);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    });
  });

  it("throws Unauthorized when no session", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(getCategories()).rejects.toThrow("Unauthorized");
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("returns empty array when user has no categories", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindMany.mockResolvedValue([]);

    const result = await getCategories();

    expect(result).toEqual([]);
  });
});

describe("createCategory", () => {
  it("creates and returns a category with trimmed name", async () => {
    const category = { id: "cat-1", name: "Food" };
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockCreate.mockResolvedValue(category);

    const result = await createCategory({ name: "Food" });

    expect(result).toEqual(category);
    expect(mockCreate).toHaveBeenCalledWith({
      data: { name: "Food", userId: "user-1" },
      select: { id: true, name: true },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/categories");
  });

  it("throws Unauthorized when no session", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(createCategory({ name: "Food" })).rejects.toThrow(
      "Unauthorized",
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("throws Category name is required for empty string", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    await expect(createCategory({ name: "" })).rejects.toThrow(
      "Category name is required",
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("throws Category name is required for whitespace-only name", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    await expect(createCategory({ name: "   " })).rejects.toThrow(
      "Category name is required",
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("trims whitespace from name", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockCreate.mockResolvedValue({ id: "cat-1", name: "Groceries" });

    await createCategory({ name: "  Groceries  " });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: "Groceries", userId: "user-1" },
      }),
    );
  });

  it("propagates Prisma errors (e.g., unique constraint violation)", async () => {
    const error = new Error("Unique constraint failed");
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockCreate.mockRejectedValue(error);

    await expect(createCategory({ name: "Food" })).rejects.toThrow(
      "Unique constraint failed",
    );
  });
});

describe("deleteCategory", () => {
  it("deletes and returns the category", async () => {
    const category = { id: "cat-1", name: "Food" };
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockDelete.mockResolvedValue(category);

    const result = await deleteCategory("cat-1");

    expect(result).toEqual(category);
    expect(mockDelete).toHaveBeenCalledWith({
      where: { id: "cat-1", userId: "user-1" },
      select: { id: true, name: true },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/categories");
  });

  it("throws Unauthorized when no session", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(deleteCategory("cat-1")).rejects.toThrow("Unauthorized");
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("propagates Prisma errors (e.g., linked transactions)", async () => {
    const error = new Error("Foreign key constraint violation");
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockDelete.mockRejectedValue(error);

    await expect(deleteCategory("cat-1")).rejects.toThrow(
      "Foreign key constraint violation",
    );
  });

  it("throws RecordNotFound when category does not exist", async () => {
    const error = new Error("Record to delete does not exist");
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockDelete.mockRejectedValue(error);

    await expect(deleteCategory("nonexistent-id")).rejects.toThrow(
      "Record to delete does not exist",
    );
  });
});

describe("renameCategory", () => {
  it("renames and returns the category with trimmed name", async () => {
    const category = { id: "cat-1", name: "Bills" };
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockUpdate.mockResolvedValue(category);

    const result = await renameCategory({ id: "cat-1", name: "Bills" });

    expect(result).toEqual(category);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "cat-1", userId: "user-1" },
      data: { name: "Bills" },
      select: { id: true, name: true },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/categories");
  });

  it("throws Unauthorized when no session", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(
      renameCategory({ id: "cat-1", name: "Bills" }),
    ).rejects.toThrow("Unauthorized");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("throws Category name is required for empty string", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    await expect(renameCategory({ id: "cat-1", name: "" })).rejects.toThrow(
      "Category name is required",
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("throws Category name is required for whitespace-only name", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    await expect(renameCategory({ id: "cat-1", name: "   " })).rejects.toThrow(
      "Category name is required",
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("trims whitespace from name", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockUpdate.mockResolvedValue({ id: "cat-1", name: "Bills" });

    await renameCategory({ id: "cat-1", name: "  Bills  " });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: "Bills" } }),
    );
  });
});
