import { requireUser } from "@/lib/dal";

// Placeholder — real dashboard lands in Phase 3
export default async function DashboardPage() {
  await requireUser();

  return (
    <section>
      <h1 className="text-xl font-semibold text-slate-100">Dashboard</h1>
      <p className="mt-2 text-sm text-slate-400">Incident list coming next.</p>
    </section>
  );
}
