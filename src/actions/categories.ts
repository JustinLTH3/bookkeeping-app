"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getCategories(
  offset?: number,
  limit?: number,
): Promise<{
  categories: { id: string; name: string }[];
  totalCount: number;
}> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const where = { userId: session.user.id };

  if (offset !== undefined && limit !== undefined) {
    const skip = offset;

    const [categories, totalCount] = await Promise.all([
      prisma.category.findMany({
        where,
        orderBy: { createdAt: "desc" },
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
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });

  return { categories, totalCount: categories.length };
}

export async function createCategory(data: { name: string }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = data.name.trim();
  if (!name) throw new Error("Category name is required");

  const category = await prisma.category.create({
    data: { name, userId: session.user.id },
    select: { id: true, name: true },
  });

  revalidatePath("/categories");
  revalidatePath("/transactions");
  return category;
}

export async function deleteCategory(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const category = await prisma.category.delete({
    where: { id, userId: session.user.id },
    select: { id: true, name: true },
  });

  revalidatePath("/categories");
  revalidatePath("/transactions");
  return category;
}

export async function renameCategory(data: { id: string; name: string }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = data.name.trim();
  if (!name) throw new Error("Category name is required");

  const category = await prisma.category.update({
    where: { id: data.id, userId: session.user.id },
    data: { name },
    select: { id: true, name: true },
  });

  revalidatePath("/categories");
  revalidatePath("/transactions");
  return category;
}
