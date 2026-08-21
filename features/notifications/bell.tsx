import { getUser } from "@/lib/dal";
import { getNotifications } from "./queries";
import { NotificationsPanel } from "./panel";

export async function NotificationsBell() {
  const user = await getUser();
  if (!user) return null;

  const { items, unread } = await getNotifications(user.id);

  return (
    <NotificationsPanel userId={user.id} initialItems={items} initialUnread={unread} />
  );
}
