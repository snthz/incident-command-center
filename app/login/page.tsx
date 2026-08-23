import type { Metadata } from "next";
import Image from "next/image";
import { DemoUsers } from "@/features/auth/demo-users";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Sign in — Incident Command Center" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const redirectTo = typeof params.redirectTo === "string" ? params.redirectTo : undefined;

  return (
    <main className="flex flex-1 flex-col items-center bg-background px-6 py-10">
      <div className="flex w-full max-w-sm flex-1 flex-col justify-center py-8">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/icons/icc-terminal-isotipo.svg"
            alt=""
            width={52}
            height={52}
            priority
          />
          <h1 className="mt-6 text-2xl font-semibold text-foreground">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Sign in to Incident Command Center
          </p>
        </div>

        <div className="mt-10">
          <LoginForm redirectTo={redirectTo} />
        </div>

        <div className="mt-10 flex items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-line" />
          <span className="text-xs text-muted">or explore with a demo account</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <div className="mt-4">
          <DemoUsers />
        </div>
      </div>

      <p className="pt-6 text-xs text-muted">
        Access is invite-based — no sign-up required.
      </p>
    </main>
  );
}
