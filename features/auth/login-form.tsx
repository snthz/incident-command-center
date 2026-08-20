"use client";

import { useActionState, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { signIn, type SignInState } from "./actions";

const initialState: SignInState = {};

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  // Controlled: React 19 resets uncontrolled fields once a form action
  // settles, which would wipe what the user typed on a validation error.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const errorId = useId();

  return (
    // noValidate: Zod owns validation so the messages stay consistent
    // whether the browser or the server rejects the input.
    <form
      action={formAction}
      noValidate
      className="flex flex-col gap-4"
      aria-describedby={state.error ? errorId : undefined}
    >
      {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}

      <TextField
        label="Email"
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={state.fieldErrors?.email}
      />

      <TextField
        label="Password"
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={state.fieldErrors?.password}
      />

      {state.error ? (
        <p id={errorId} role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
