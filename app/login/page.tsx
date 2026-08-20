import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Sign in — Incident Command Center" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const redirectTo = typeof params.redirectTo === "string" ? params.redirectTo : undefined;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-surface p-6 shadow-xl">
        <h1 className="text-lg font-semibold text-slate-100">Incident Command Center</h1>
        <p className="mb-6 mt-1 text-sm text-slate-400">
          Sign in to monitor and coordinate active incidents.
        </p>
        <LoginForm redirectTo={redirectTo} />
        <p className="mt-6 border-t border-white/10 pt-4 text-xs text-slate-500">
          Demo users: ana@icc.dev, marco@icc.dev, lucia@icc.dev — password{" "}
          <code className="font-mono">password123</code>
        </p>
      </div>
    </main>
  );
}
