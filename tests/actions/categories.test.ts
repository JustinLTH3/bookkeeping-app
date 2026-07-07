import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCategories } from "@/actions/categories";

const { mockAuth, mockFindMany } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindMany: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    category: {
      findMany: mockFindMany,
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
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
