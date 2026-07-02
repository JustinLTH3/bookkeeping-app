import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-full flex-col items-center justify-center py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Bookkeeping App</h1>
      <p className="mt-2 text-zinc-500">Track your income and expenses</p>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/dashboard" });
        }}
        className="mt-8"
      >
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Sign in with Google
        </button>
      </form>
    </div>
  );
}
