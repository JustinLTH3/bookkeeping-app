"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Transactions", href: "/transactions" },
  { label: "Categories", href: "/categories" },
];

export function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-primary text-white transition-transform duration-200 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } md:sticky md:top-0 md:h-screen md:translate-x-0`}
    >
      <div className="px-6 py-8">
        <h1 className="text-xl font-semibold tracking-tight">Bookkeeping</h1>
      </div>

      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-secondary/10 text-secondary"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-6 py-4">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/20 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
