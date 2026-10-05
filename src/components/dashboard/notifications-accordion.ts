type NotificationListEntry = {
  id: string;
};

export const getNextExpandedNotificationId = (
  currentId: string | null,
  clickedId: string
): string | null => (currentId === clickedId ? null : clickedId);

export const normalizeExpandedIdAfterListChange = <T extends NotificationListEntry>(
  expandedId: string | null,
  notifications: T[]
): string | null => {
  if (!expandedId) {
    return null;
  }

  return notifications.some((notification) => notification.id === expandedId)
    ? expandedId
    : null;
};
