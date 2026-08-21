import { getUser } from "@/lib/dal";
import { signOut } from "./actions";
import { UserMenuDropdown } from "./user-menu-dropdown";

export async function UserMenu() {
  const user = await getUser();
  if (!user) return null;

  const name =
    (user.user_metadata?.name as string | undefined) ?? user.email ?? "User";

  return (
    <UserMenuDropdown
      name={name}
      email={user.email ?? undefined}
      signOutAction={signOut}
    />
  );
}
