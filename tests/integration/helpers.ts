import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { expect } from "vitest";
import { faker } from "@faker-js/faker";

export { faker };

export async function truncateAll() {
  await prisma.$executeRaw`TRUNCATE TABLE "Transaction", "Category", "User" CASCADE`;
}

export function createUser(email: string) {
  return prisma.user.create({ data: { email, name: email } });
}

export function createCategory(userId: string, name: string) {
  return prisma.category.create({ data: { userId, name } });
}

export function createTransaction(
  userId: string,
  categoryId: string,
  amount: number,
  date: Date,
  description?: string,
) {
  return prisma.transaction.create({
    data: { userId, categoryId, amount, date, description },
  });
}

/** Assert `actual` equals `expected` using Prisma.Decimal — the same
 *  exact-arithmetic library the production dashboard actions use. */
export function expectDec(
  actual: number,
  expected: Prisma.Decimal | string | number,
) {
  const a = new Prisma.Decimal(actual);
  const e = new Prisma.Decimal(expected);
  expect(a.equals(e), `${a.toString()} !== ${e.toString()}`).toBe(true);
}
