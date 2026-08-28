import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCategories,
  createCategory,
  deleteCategory,
  renameCategory,
} from "@/actions/categories";

const {
  mockRequireUserId,
  mockFindMany,
  mockCreate,
  mockDelete,
  mockUpdate,
  mockCount,
  mockRevalidatePath,
} = vi.hoisted(() => ({
  mockRequireUserId: vi.fn(),
  mockFindMany: vi.fn(),
  mockCreate: vi.fn(),
  mockDelete: vi.fn(),
  mockUpdate: vi.fn(),
  mockCount: vi.fn(),
  mockRevalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireUserId: mockRequireUserId,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    category: {
      findMany: mockFindMany,
      create: mockCreate,
      delete: mockDelete,
      update: mockUpdate,
      count: mockCount,
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
  it("returns all categories when called without pagination", async () => {
    const categories = [
      { id: "cat-1", name: "Food" },
      { id: "cat-2", name: "Transport" },
    ];
    mockRequireUserId.mockResolvedValue("user-1");
    mockFindMany.mockResolvedValue(categories);

    const result = await getCategories();

    expect(result).toEqual({
      categories,
      totalCount: 2,
    });
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, name: true },
    });
    expect(mockCount).not.toHaveBeenCalled();
  });

  it("returns paginated categories when offset and limit provided", async () => {
    const categories = [
      { id: "cat-1", name: "Food" },
      { id: "cat-2", name: "Transport" },
    ];
    mockRequireUserId.mockResolvedValue("user-1");
    mockFindMany.mockResolvedValue(categories);
    mockCount.mockResolvedValue(25);

    const result = await getCategories(0, 10);

    expect(result).toEqual({
      categories,
      totalCount: 25,
    });
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: 0,
      take: 10,
      select: { id: true, name: true },
    });
    expect(mockCount).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
  });

  it("throws Unauthorized when no session", async () => {
    mockRequireUserId.mockRejectedValue(new Error("Unauthorized"));

    await expect(getCategories()).rejects.toThrow("Unauthorized");
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("returns empty categories array when user has no categories", async () => {
    mockRequireUserId.mockResolvedValue("user-1");
    mockFindMany.mockResolvedValue([]);

    const result = await getCategories();

    expect(result).toEqual({ categories: [], totalCount: 0 });
  });
});

describe("createCategory", () => {
  it("creates and returns a category with trimmed name", async () => {
    const category = { id: "cat-1", name: "Food" };
    mockRequireUserId.mockResolvedValue("user-1");
    mockCreate.mockResolvedValue(category);

    const result = await createCategory({ name: "Food" });

    expect(result).toEqual(category);
    expect(mockCreate).toHaveBeenCalledWith({
      data: { name: "Food", userId: "user-1" },
      select: { id: true, name: true },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/categories");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/transactions");
  });

  it("throws Unauthorized when no session", async () => {
    mockRequireUserId.mockRejectedValue(new Error("Unauthorized"));

    await expect(createCategory({ name: "Food" })).rejects.toThrow(
      "Unauthorized",
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("throws Category name is required for empty string", async () => {
    mockRequireUserId.mockResolvedValue("user-1");

    await expect(createCategory({ name: "" })).rejects.toThrow(
      "Category name is required",
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("throws Category name is required for whitespace-only name", async () => {
    mockRequireUserId.mockResolvedValue("user-1");

    await expect(createCategory({ name: "   " })).rejects.toThrow(
      "Category name is required",
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("trims whitespace from name", async () => {
    mockRequireUserId.mockResolvedValue("user-1");
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
    mockRequireUserId.mockResolvedValue("user-1");
    mockCreate.mockRejectedValue(error);

    await expect(createCategory({ name: "Food" })).rejects.toThrow(
      "Unique constraint failed",
    );
  });
});

describe("deleteCategory", () => {
  it("deletes and returns the category", async () => {
    const category = { id: "cat-1", name: "Food" };
    mockRequireUserId.mockResolvedValue("user-1");
    mockDelete.mockResolvedValue(category);

    const result = await deleteCategory("cat-1");

    expect(result).toEqual(category);
    expect(mockDelete).toHaveBeenCalledWith({
      where: { id: "cat-1", userId: "user-1" },
      select: { id: true, name: true },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/categories");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/transactions");
  });

  it("throws Unauthorized when no session", async () => {
    mockRequireUserId.mockRejectedValue(new Error("Unauthorized"));

    await expect(deleteCategory("cat-1")).rejects.toThrow("Unauthorized");
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("propagates Prisma errors (e.g., linked transactions)", async () => {
    const error = new Error("Foreign key constraint violation");
    mockRequireUserId.mockResolvedValue("user-1");
    mockDelete.mockRejectedValue(error);

    await expect(deleteCategory("cat-1")).rejects.toThrow(
      "Foreign key constraint violation",
    );
  });

  it("throws RecordNotFound when category does not exist", async () => {
    const error = new Error("Record to delete does not exist");
    mockRequireUserId.mockResolvedValue("user-1");
    mockDelete.mockRejectedValue(error);

    await expect(deleteCategory("nonexistent-id")).rejects.toThrow(
      "Record to delete does not exist",
    );
  });
});

describe("renameCategory", () => {
  it("renames and returns the category with trimmed name", async () => {
    const category = { id: "cat-1", name: "Bills" };
    mockRequireUserId.mockResolvedValue("user-1");
    mockUpdate.mockResolvedValue(category);

    const result = await renameCategory({ id: "cat-1", name: "Bills" });

    expect(result).toEqual(category);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "cat-1", userId: "user-1" },
      data: { name: "Bills" },
      select: { id: true, name: true },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/categories");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/transactions");
  });

  it("throws Unauthorized when no session", async () => {
    mockRequireUserId.mockRejectedValue(new Error("Unauthorized"));

    await expect(
      renameCategory({ id: "cat-1", name: "Bills" }),
    ).rejects.toThrow("Unauthorized");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("throws Category name is required for empty string", async () => {
    mockRequireUserId.mockResolvedValue("user-1");

    await expect(renameCategory({ id: "cat-1", name: "" })).rejects.toThrow(
      "Category name is required",
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("throws Category name is required for whitespace-only name", async () => {
    mockRequireUserId.mockResolvedValue("user-1");

    await expect(renameCategory({ id: "cat-1", name: "   " })).rejects.toThrow(
      "Category name is required",
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("trims whitespace from name", async () => {
    mockRequireUserId.mockResolvedValue("user-1");
    mockUpdate.mockResolvedValue({ id: "cat-1", name: "Bills" });

    await renameCategory({ id: "cat-1", name: "  Bills  " });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: "Bills" } }),
    );
  });
});
