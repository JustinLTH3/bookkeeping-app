import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { expect } from "vitest";
import { faker } from "@faker-js/faker";
import dayjs from "dayjs";

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
  // DATE column: normalize to UTC midnight of the date's local calendar day
  const dateOnly = dayjs(date).format("YYYY-MM-DD");
  return prisma.transaction.create({
    data: {
      userId,
      categoryId,
      amount,
      date: new Date(`${dateOnly}T00:00:00.000Z`),
      description,
    },
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
