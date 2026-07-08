import type { Transaction } from "@/app/(app)/transactions/page";
import dayjs from "dayjs";

const ITEMS_PER_PAGE = 10;

type Props = {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
};

export function TransactionTable({ transactions, onEdit, onDelete }: Props) {
  const emptyRows = Math.max(0, ITEMS_PER_PAGE - transactions.length);

  return (
    <div className="overflow-hidden rounded-lg border border-primary/10 bg-white">
      <table className="w-full table-fixed">
        <thead>
          <tr className="bg-primary text-white">
            <th className="w-[12%] px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
              Date
            </th>
            <th className="w-[28%] px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
              Description
            </th>
            <th className="w-[18%] px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
              Category
            </th>
            <th className="w-[22%] px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
              Amount
            </th>
            <th className="w-[20%] px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral">
          {transactions.map((transaction) => {
            const isIncome = transaction.amount >= 0;
            const formatted = new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(Math.abs(transaction.amount));

            return (
              <tr key={transaction.id} className="hover:bg-neutral/50">
                <td className="px-6 py-4 text-primary text-sm">
                  {dayjs(transaction.date).format("MMM D, YYYY")}
                </td>
                <td className="px-6 py-4 text-primary text-sm wrap-break-words">
                  {transaction.description || "—"}
                </td>
                <td className="px-6 py-4 text-primary text-sm">
                  {transaction.category.name}
                </td>
                <td
                  className={`px-6 py-4 text-sm whitespace-nowrap text-right font-medium tabular-nums ${
                    isIncome ? "text-secondary" : "text-red-600"
                  }`}
                >
                  {isIncome ? "+" : "-"}
                  {formatted}
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex flex-row items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(transaction)}
                      className="rounded-md px-3 py-1.5 font-medium bg-secondary/10 text-secondary hover:bg-secondary/20"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(transaction.id)}
                      className="rounded-md px-3 py-1.5 font-medium bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {emptyRows > 0 &&
            Array.from({ length: emptyRows }).map((_, i) => (
              <tr key={`empty-${i}`} aria-hidden="true">
                <td className="px-6 py-4">&nbsp;</td>
                <td className="px-6 py-4">&nbsp;</td>
                <td className="px-6 py-4">&nbsp;</td>
                <td className="px-6 py-4">&nbsp;</td>
                <td className="px-6 py-4">&nbsp;</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
