import { useContext, useEffect, useRef } from 'react';
import { NotificationContext } from 'mod-arch-core';

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
