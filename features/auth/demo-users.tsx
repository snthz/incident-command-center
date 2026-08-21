"use client";

import { useState } from "react";
import { CopyButton } from "@/components/ui/copy-button";
import { Select } from "@/components/ui/select";

const DEMO_PASSWORD = "password123";

const DEMO_USERS = [
  { email: "axl.santos@icc.dev", name: "Axl Santos", role: "Admin" },
  { email: "mario.pon@icc.dev", name: "Mario Pon", role: "Member" },
  { email: "christian.rivera@icc.dev", name: "Christian Rivera", role: "Member" },
  { email: "eduard.chinchilla@icc.dev", name: "Eduard Chinchilla", role: "Member" },
  { email: "gadi.orellana@icc.dev", name: "Gadi Orellana", role: "Member" },
];

const options = DEMO_USERS.map((user) => ({
  value: user.email,
  label: user.email,
  description: `${user.name} · ${user.role}`,
}));

export function DemoUsers() {
  const [email, setEmail] = useState(DEMO_USERS[0].email);

  return (
    <div className="rounded-lg border border-line bg-surface-2/40 p-3">
      <p className="text-xs font-medium text-neutral-300">Demo users</p>

      <div className="mt-2 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <Select
            aria-label="Demo user email"
            size="sm"
            placement="top"
            options={options}
            value={email}
            onChange={setEmail}
            className="w-full font-mono"
          />
        </div>
        <CopyButton value={email} label="email" />
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded border border-line bg-surface-2 px-2 py-1">
          <span className="truncate font-mono text-xs text-foreground">
            {DEMO_PASSWORD}
          </span>
          <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted">
            password
          </span>
        </div>
        <CopyButton value={DEMO_PASSWORD} label="password" />
      </div>
    </div>
  );
}
