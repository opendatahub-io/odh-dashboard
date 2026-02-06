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
  const lastNotificationIdRef = useRef<number | undefined>();

  useEffect(() => {
    if (notifications.length > 0) {
      const lastNotification = notifications[notifications.length - 1];
      
      // Only dispatch event for new notifications we haven't seen before
      if (lastNotification.id !== lastNotificationIdRef.current && !lastNotification.hidden) {
        lastNotificationIdRef.current = lastNotification.id;
        
        try {
          const messageStr =
            typeof lastNotification.message === 'string' ? lastNotification.message : undefined;

          // Dispatch a custom event that the midstream can listen to
          const event = new CustomEvent(NOTIFICATION_BRIDGE_EVENT, {
            detail: {
              status: lastNotification.status,
              title: lastNotification.title,
              message: messageStr,
              timestamp: lastNotification.timestamp?.toISOString() || new Date().toISOString(),
            },
          });
          
          window.dispatchEvent(event);
        } catch (error) {
          console.error('[NotificationBridge] Failed to dispatch notification:', error);
        }
      }
    }
  }, [notifications]);
};
