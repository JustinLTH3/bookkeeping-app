import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const DEFAULT_CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Utilities",
  "Entertainment",
  "Salary",
  "Other",
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  events: {
    createUser: async ({ user }) => {
      const userId = user.id;
      if (!userId) return;
      await prisma.category.createMany({
        data: DEFAULT_CATEGORIES.map((name) => ({
          name,
          userId,
        })),
      });
    },
  },
});
