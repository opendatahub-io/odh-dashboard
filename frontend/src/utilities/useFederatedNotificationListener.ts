import { useEffect } from 'react';
import { AlertVariant } from '@patternfly/react-core';
import { useAppDispatch } from '#~/redux/hooks';
import { addNotification } from '#~/redux/actions/actions';

/**
 * TODO: TECH DEBT - Temporary workaround for federated module notification integration
 *
 * This file exists because:
 * - Federated modules (model-registry) use mod-arch-core's NotificationContext
 * - Midstream (odh-dashboard) uses Redux for notification state
 * - These two systems don't communicate directly
 *
 * FUTURE WORK: Convert midstream's Redux-based notification system to use mod-arch-core's
 * NotificationContext instead. Once that's done, this bridge will no longer be needed.
 *
 * https://issues.redhat.com/browse/RHOAIENG-48894 is the JIRA ticket for this work.
 */

// Custom event name for bridging notifications between federated module and midstream
// Must match the event name in the federated module's useNotificationListener
const NOTIFICATION_BRIDGE_EVENT = 'odh-notification-bridge';

export const useFederatedNotificationListener = (): void => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const handleNotificationEvent = (event: Event) => {
      try {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const customEvent = event as CustomEvent;
        if (!customEvent.detail) {
          return;
        }

        const { status, title, message, timestamp } = customEvent.detail;

        const timestampDate = timestamp ? new Date(timestamp) : new Date();

        dispatch(
          addNotification({
            status: status || AlertVariant.info,
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
