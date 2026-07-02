import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/");

  return (
    <div className="flex min-h-full flex-col items-center justify-center py-16">
      <p className="text-2xl font-semibold">Welcome, {session?.user?.name}</p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
        className="mt-4"
      >
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
