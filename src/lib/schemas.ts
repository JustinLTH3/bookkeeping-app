import { z } from "zod";

export const CategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Category name is required"),
});

export const TransactionSchema = z.object({
  amount: z.preprocess(
    (v) => {
      const n = typeof v === "number" ? v : Number(v);
      return isNaN(n) || n === 0 ? 0 : n;
    },
    z.number().refine((n) => n !== 0, {
      message: "Amount must be a non-zero number",
    }),
  ),
  description: z.string().nullable(),
  date: z.string().min(1, "Date is required"),
  categoryId: z.string().min(1, "Category is required"),
});
