import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/dal";
import { signOut } from "./actions";

export async function UserMenu() {
  const user = await getUser();
  if (!user) return null;

  const name =
    (user.user_metadata?.name as string | undefined) ?? user.email ?? "User";

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-muted sm:inline" title={user.email ?? undefined}>
        {name}
      </span>
      <form action={signOut}>
        <Button type="submit" variant="secondary" className="py-1.5 font-normal">
          Sign out
        </Button>
      </form>
    </div>
  );
}
