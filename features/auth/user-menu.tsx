import { getUser } from "@/lib/dal";
import { signOut } from "./actions";

export async function UserMenu() {
  const user = await getUser();
  if (!user) return null;

  const name =
    (user.user_metadata?.name as string | undefined) ?? user.email ?? "User";

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-slate-400 sm:inline" title={user.email ?? undefined}>
        {name}
      </span>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
