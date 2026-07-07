"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getCategories() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return prisma.category.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });
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
  return category;
}
