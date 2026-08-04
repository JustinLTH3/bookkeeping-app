"use server";

import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const nonEmptyTrimmed = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().min(1, "Category name is required"));

const CategoryInput = z.object({
  id: z.string().optional(),
  name: nonEmptyTrimmed,
});

function revalidateCategoryPaths() {
  revalidatePath("/categories");
  revalidatePath("/transactions");
}

export async function getCategories(
  offset?: number,
  limit?: number,
): Promise<{
  categories: { id: string; name: string }[];
  totalCount: number;
}> {
  const userId = await requireUserId();

  const where = { userId };

  if (offset !== undefined && limit !== undefined) {
    const skip = offset;

    const [categories, totalCount] = await Promise.all([
      prisma.category.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take: limit,
        select: { id: true, name: true },
      }),
      prisma.category.count({ where }),
    ]);

    return { categories, totalCount };
  }

  const categories = await prisma.category.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, name: true },
  });

  return { categories, totalCount: categories.length };
}

export async function createCategory(data: { name: string }) {
  const userId = await requireUserId();

  const parsed = CategoryInput.safeParse(data);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const category = await prisma.category.create({
    data: { name: parsed.data.name, userId },
    select: { id: true, name: true },
  });

  revalidateCategoryPaths();
  return category;
}

export async function deleteCategory(id: string) {
  const userId = await requireUserId();

  const category = await prisma.category.delete({
    where: { id, userId },
    select: { id: true, name: true },
  });

  revalidateCategoryPaths();
  return category;
}

export async function renameCategory(data: { id: string; name: string }) {
  const userId = await requireUserId();

  const parsed = CategoryInput.safeParse(data);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const category = await prisma.category.update({
    where: { id: parsed.data.id ?? data.id, userId },
    data: { name: parsed.data.name },
    select: { id: true, name: true },
  });

  revalidateCategoryPaths();
  return category;
}
