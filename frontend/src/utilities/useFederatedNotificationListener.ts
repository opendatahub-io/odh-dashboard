import { useEffect } from 'react';
import { useAppDispatch } from '#~/redux/hooks';
import { addNotification } from '#~/redux/actions/actions';
import { AlertVariant } from '@patternfly/react-core';

// Custom event name for bridging notifications between federated module and midstream
// Must match the event name in the federated module's useNotificationListener
const NOTIFICATION_BRIDGE_EVENT = 'odh-notification-bridge';

type NotificationBridgeEvent = CustomEvent<{
  status: string;
  title: string;
  message?: string;
  timestamp: string;
}>;

export const useFederatedNotificationListener = (): void => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const handleNotificationEvent = (event: Event) => {
      try {
        const notificationEvent = event as NotificationBridgeEvent;
        const { status, title, message, timestamp } = notificationEvent.detail;

        const timestampDate = timestamp ? new Date(timestamp) : new Date();

        dispatch(
          addNotification({
            status: status as AlertVariant,
            title,
            message,
            timestamp: timestampDate,
          }),
        );
      } catch (error) {
        console.error('[NotificationBridge] Failed to handle notification event:', error);
      }
    };

    window.addEventListener(NOTIFICATION_BRIDGE_EVENT, handleNotificationEvent);

    return () => {
      window.removeEventListener(NOTIFICATION_BRIDGE_EVENT, handleNotificationEvent);
    };
  }, [dispatch]);
};
