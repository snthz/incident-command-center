import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/features/auth/login-form";
import { Logo } from "@/features/branding/logo";

export const metadata: Metadata = { title: "Sign in — Incident Command Center" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const redirectTo = typeof params.redirectTo === "string" ? params.redirectTo : undefined;

  return (
    <main className="flex flex-1">
      {/* Form panel */}
      <div className="flex w-full flex-col bg-surface lg:w-120 xl:w-130">
        <header className="px-6 py-6 lg:px-8">
          <Logo />
        </header>

        <div className="flex flex-1 items-center justify-center px-6 lg:px-8">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-semibold text-foreground">Welcome back</h1>
            <p className="mb-8 mt-1 text-sm text-muted">
              Sign in to monitor and coordinate active incidents.
            </p>
            <LoginForm redirectTo={redirectTo} />
          </div>
        </div>

        <footer className="px-6 py-6 lg:px-8">
          <p className="text-xs text-muted">
            Demo users: ana@icc.dev, marco@icc.dev, lucia@icc.dev — password{" "}
            <code className="font-mono text-neutral-400">password123</code>
          </p>
        </footer>
      </div>

      {/* Quote panel */}
      <aside className="hidden flex-1 items-center justify-center border-l border-line bg-background p-12 lg:flex">
        <figure className="max-w-xl">
          <span aria-hidden className="select-none font-serif text-7xl leading-none text-neutral-700">
            &ldquo;
          </span>
          <blockquote className="mt-2 text-2xl leading-relaxed text-foreground">
            When everything is on fire, the team that sees the same picture first
            wins. One shared timeline beats a hundred scattered pings.
          </blockquote>
          <figcaption className="mt-6 flex items-center gap-3">
            <Image
              src="/icons/icc-favicon.svg"
              alt=""
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="text-sm text-muted">@icc-oncall</span>
          </figcaption>
        </figure>
      </aside>
    </main>
  );
}
