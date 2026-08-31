import { LockKeyhole } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { signIn } from "./actions";

export const metadata = { title: "Admin sign in" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="relative grid min-h-svh place-items-center overflow-hidden px-4 py-8">
      <div className="ambient-glow" aria-hidden="true" />
      <div className="relative w-full max-w-md">
        <header className="mb-6 flex items-center justify-between">
          <Brand compact />
          <ThemeToggle />
        </header>
        <section className="surface-card p-6 sm:p-8">
          <span className="bg-violet/10 text-violet grid size-11 place-items-center rounded-xl">
            <LockKeyhole size={20} aria-hidden="true" />
          </span>
          <h1 className="text-foreground mt-5 text-2xl font-semibold">
            Owner sign in
          </h1>
          <p className="text-muted mt-2 text-sm leading-6">
            Use the Supabase account configured for this demo.
          </p>
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
            >
              {error === "unauthorized"
                ? "This account is not permitted to view the demo."
                : "The email or password was not accepted."}
            </p>
          )}
          <form action={signIn} className="mt-6 space-y-4">
            <label className="text-foreground block text-sm font-medium">
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className="focus-ring border-border bg-elevated text-foreground mt-2 min-h-11 w-full rounded-xl border px-3.5 outline-none"
              />
            </label>
            <label className="text-foreground block text-sm font-medium">
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="focus-ring border-border bg-elevated text-foreground mt-2 min-h-11 w-full rounded-xl border px-3.5 outline-none"
              />
            </label>
            <button
              className="focus-ring bg-brand-gradient shadow-violet min-h-12 w-full rounded-xl font-semibold text-white"
              type="submit"
            >
              Sign in
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
