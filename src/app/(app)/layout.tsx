import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-neutral">{children}</main>
    </div>
  );
}
