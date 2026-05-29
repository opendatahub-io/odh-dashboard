import { AlertVariant } from '@patternfly/react-core';
import React from 'react';
import { AppNotificationAction, useStore } from '~/app/store';

enum NotificationTypes {
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info',
  WARNING = 'warning',
}

type NotificationProps = (
  title: string,
  message?: React.ReactNode,
  actions?: AppNotificationAction[],
) => void;

type NotificationRemoveProps = (id: string) => void;

type NotificationTypeFunc = {
  [key in NotificationTypes]: NotificationProps;
};

interface NotificationFunc extends NotificationTypeFunc {
  remove: NotificationRemoveProps;
}

/**
 * Hook for displaying toast notifications throughout the application.
 * Provides methods to show success, error, info, and warning notifications
 * with optional messages and action links.
 *
 * All notifications are automatically added to the global notification store
 * and will appear as toast messages with an 8-second auto-dismiss timeout
 * (see ToastNotification component for timeout behavior).
 *
 * @returns Object with notification methods:
 * - `success(title, message?, actions?)` - Display success notification (green)
 * - `error(title, message?, actions?)` - Display error notification (red)
 * - `info(title, message?, actions?)` - Display info notification (blue)
 * - `warning(title, message?, actions?)` - Display warning notification (gold)
 * - `remove(id)` - Manually remove a notification by ID
 *
 * @example
 * // Basic usage - success notification
 * const notification = useNotification();
 *
 * const handleSubmit = async () => {
 *   try {
 *     await createExperiment(data);
 *     notification.success('Experiment created successfully');
 *   } catch (error) {
 *     notification.error('Failed to create experiment', error.message);
 *   }
 * };
 *
 * @example
 * // With action links
 * const notification = useNotification();
 *
 * const handleSave = async () => {
 *   await saveModel(model);
 *   notification.info(
 *     'Model saved',
 *     'Your model has been saved to the registry',
 *     [
 *       { title: 'View model', onClick: () => navigate('/models') },
 *       { title: 'Train now', onClick: () => startTraining() }
 *     ]
 *   );
 * };
 *
 * @example
 * // Warning notification with detailed message
 * const notification = useNotification();
 *
 * notification.warning(
 *   'Storage limit approaching',
 *   <>
 *     You have used 85% of your storage quota.
 *     <br />
 *     Consider archiving old experiments.
 *   </>
 * );
 *
 * @example
 * // Manually removing a notification
 * const notification = useNotification();
 * const notificationId = 'my-notification-id';
 *
 * // Show notification
 * notification.info('Processing...', 'This may take a while');
 *
 * // Later, remove it manually
 * notification.remove(notificationId);
 */
export const useNotification = (): NotificationFunc => {
  const addNotification = useStore((state) => state.addNotification);
  const removeNotification = useStore((state) => state.removeNotification);

  const success: NotificationProps = React.useCallback(
    (title, message?, actions?) => {
      addNotification({
        status: AlertVariant.success,
        title,
        message,
        actions,
        timestamp: new Date(),
      });
    },
    [addNotification],
  );

  const warning: NotificationProps = React.useCallback(
    (title, message?, actions?) => {
      addNotification({
        status: AlertVariant.warning,
        title,
        message,
        actions,
        timestamp: new Date(),
      });
    },
    [addNotification],
  );

  const error: NotificationProps = React.useCallback(
    (title, message?, actions?) => {
      addNotification({
        status: AlertVariant.danger,
        title,
        message,
        actions,
        timestamp: new Date(),
      });
    },
    [addNotification],
  );

  const info: NotificationProps = React.useCallback(
    (title, message?, actions?) => {
      addNotification({
        status: AlertVariant.info,
        title,
        message,
        actions,
        timestamp: new Date(),
      });
    },
    [addNotification],
  );

  const remove: NotificationRemoveProps = React.useCallback(
    (id) => {
      removeNotification(id);
    },
    [removeNotification],
  );

  const notification = React.useMemo(
    () => ({ success, error, info, warning, remove }),
    [success, error, info, warning, remove],
  );

  return notification;
};
