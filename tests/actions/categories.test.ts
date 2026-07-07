import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCategories, createCategory } from "@/actions/categories";

const { mockAuth, mockFindMany, mockCreate, mockRevalidatePath } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindMany: vi.fn(),
  mockCreate: vi.fn(),
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

    await expect(createCategory({ name: "Food" })).rejects.toThrow("Unauthorized");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("throws Category name is required for empty string", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    await expect(createCategory({ name: "" })).rejects.toThrow("Category name is required");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("throws Category name is required for whitespace-only name", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    await expect(createCategory({ name: "   " })).rejects.toThrow("Category name is required");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("trims whitespace from name", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockCreate.mockResolvedValue({ id: "cat-1", name: "Groceries" });

    await createCategory({ name: "  Groceries  " });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: "Groceries", userId: "user-1" } })
    );
  });
});
