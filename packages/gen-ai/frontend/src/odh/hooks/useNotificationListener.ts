import { useContext, useEffect, useRef } from 'react';
import { NotificationContext } from 'mod-arch-core';

/**
 * Bridge for forwarding notifications from mod-arch-core's NotificationContext
 * to the main dashboard's Redux store via browser CustomEvents.
 *
 * This is needed because federated modules run in a separate module scope
 * and cannot directly access the main dashboard's Redux store.
 *
 * The main dashboard's useFederatedNotificationListener listens for these events
 * and dispatches them to Redux.
 */

const NOTIFICATION_BRIDGE_EVENT = 'odh-notification-bridge';

export const useNotificationListener = (): void => {
  const { notifications } = useContext(NotificationContext);
  const lastBridgedIndexRef = useRef(0);

  useEffect(() => {
    const newNotifications = notifications.slice(lastBridgedIndexRef.current);
    lastBridgedIndexRef.current = notifications.length;

    newNotifications.forEach((notification) => {
      if (notification.hidden || typeof notification.title !== 'string') {
        return;
      }

      try {
        const messageStr =
          typeof notification.message === 'string' ? notification.message : undefined;

        const ts = new Date(notification.timestamp);
        const timestamp = Number.isNaN(ts.getTime()) ? new Date() : ts;

        const detail: Record<string, unknown> = {
          status: notification.status,
          title: notification.title,
          message: messageStr,
          timestamp: timestamp.toISOString(),
        };

        window.dispatchEvent(new CustomEvent(NOTIFICATION_BRIDGE_EVENT, { detail }));
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[NotificationBridge] Failed to dispatch notification:', error);
      }
    });
  }, [notifications]);
};
