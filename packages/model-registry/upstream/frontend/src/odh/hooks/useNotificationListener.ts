import { useContext, useEffect, useRef } from 'react';
import { NotificationContext } from 'mod-arch-core';

/**
 * TODO: TECH DEBT - Temporary workaround for federated module notification integration
 *
 * This file bridges notifications from mod-arch-core's NotificationContext to the midstream's
 * Redux store using browser CustomEvents because the federated module runs in a separate React tree.
 *
 * FUTURE WORK: Once midstream migrates from Redux to mod-arch-core's NotificationContext,
 * this bridge can be removed and notifications will work natively.
 *
 * https://issues.redhat.com/browse/RHOAIENG-48894 is the JIRA ticket for this work.
 */

const NOTIFICATION_BRIDGE_EVENT = 'odh-notification-bridge';

export const useNotificationListener = (): void => {
  const { notifications } = useContext(NotificationContext);
  // Relies on mod-arch-core's NotificationContext reducer preserving object references for existing notifications
  const bridgedRef = useRef<WeakSet<object>>(new WeakSet());

  useEffect(() => {
    notifications.forEach((notification) => {
      if (bridgedRef.current.has(notification)) {
        return;
      }
      bridgedRef.current.add(notification);

      if (notification.hidden || typeof notification.title !== 'string') {
        return;
      }

      try {
        const messageStr =
          typeof notification.messageText === 'string'
            ? notification.messageText
            : typeof notification.message === 'string'
              ? notification.message
              : undefined;

        const detail: Record<string, unknown> = {
          status: notification.status,
          title: notification.title,
          message: messageStr,
          timestamp: notification.timestamp?.toISOString() || new Date().toISOString(),
          ...(notification.linkUrl && notification.linkLabel && {
            linkUrl: notification.linkUrl,
            linkLabel: notification.linkLabel,
          }),
        };

        window.dispatchEvent(new CustomEvent(NOTIFICATION_BRIDGE_EVENT, { detail }));
      } catch (error) {
        console.error('[NotificationBridge] Failed to dispatch notification:', error);
      }
    });
  }, [notifications]);
};
