import type { Category } from "@/app/(app)/categories/page";

const ITEMS_PER_PAGE = 10;

type Props = {
  categories: Category[];
  onEdit: (category: Category) => void;
};

export function CategoryTable({ categories, onEdit }: Props) {
  const emptyRows = Math.max(0, ITEMS_PER_PAGE - categories.length);

  return (
    <div className="overflow-hidden rounded-lg border border-primary/10 bg-white">
      <table className="w-full table-fixed">
        <thead>
          <tr className="bg-primary text-white">
            <th className="w-[80%] px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
              Name
            </th>
            <th className="w-[20%] px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral">
          {categories.map((category) => (
            <tr key={category.id} className="hover:bg-neutral/50">
              <td className="px-6 py-4 text-primary text-sm font-medium whitespace-nowrap">
                {category.name}
              </td>
              <td className="px-6 py-4 text-right text-sm whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => onEdit(category)}
                  className="rounded-md px-3 py-1.5 font-medium text-secondary hover:bg-secondary/10"
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="ml-1 rounded-md px-3 py-1.5 font-medium text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {emptyRows > 0 &&
            Array.from({ length: emptyRows }).map((_, i) => (
              <tr key={`empty-${i}`} aria-hidden="true">
                <td className="px-6 py-4">&nbsp;</td>
                <td className="px-6 py-4">&nbsp;</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
