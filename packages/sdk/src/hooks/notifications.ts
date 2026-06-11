// hooks/notifications.ts → notifications-svc (ADR-0029 prefix: /notifications-svc/...)
// Stage 40: useMyNotifications for student Bell widget + unread count.
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useMmClient } from '../context.js';
import { mmKeys } from '../keys.js';

const NotificationDTOSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  link: z.string().nullable(),
  read: z.boolean(),
  created_at: z.string(),
});

export type NotificationDTO = z.infer<typeof NotificationDTOSchema>;

// GET /notifications-svc/notifications/me — returns array of notifications.
// unreadOnly=true appends ?unread=true to filter server-side.
export function useMyNotifications(unreadOnly?: boolean) {
  const client = useMmClient();
  const path = unreadOnly
    ? '/notifications-svc/notifications/me?unread=true'
    : '/notifications-svc/notifications/me';
  return useQuery({
    queryKey: mmKeys.notifications.mine(),
    staleTime: 0,
    queryFn: () =>
      client.get(path, z.array(NotificationDTOSchema)).then((r) => r.data),
  });
}
