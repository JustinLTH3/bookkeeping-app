import type { Category } from "@/app/(app)/categories/page";

const ITEMS_PER_PAGE = 10;

type Props = {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
};

export function CategoryTable({ categories, onEdit, onDelete }: Props) {
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
              <td className="px-6 py-4 text-sm">
                <div className="flex flex-row items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(category)}
                    className="rounded-md px-3 py-1.5 font-medium bg-secondary/10 text-secondary hover:bg-secondary/20"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(category.id)}
                    className="rounded-md px-3 py-1.5 font-medium bg-red-50 text-red-600 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
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
