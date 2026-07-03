import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="px-8 py-10">
      <h1 className="text-primary text-3xl font-semibold tracking-tight">
        Dashboard
      </h1>
      <p className="mt-2 text-primary">Welcome, {session?.user?.name}</p>
    </div>
  );
}
