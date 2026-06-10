import { AlertVariant } from '@patternfly/react-core';
import * as React from 'react';
import { useAddNotification } from '#~/concepts/notifications/DashboardNotificationContext';
import { DashboardNotificationAction } from '#~/concepts/notifications/types';

type NotificationProps = (
  title: string,
  message?: React.ReactNode,
  actions?: DashboardNotificationAction[],
) => void;

type NotificationFunc = {
  [key in NotificationTypes]: NotificationProps;
};

enum NotificationTypes {
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info',
  WARNING = 'warning',
}

const useNotification = (): NotificationFunc => {
  const addNotification = useAddNotification();

  const success: NotificationProps = React.useCallback(
    (title, message, actions?) => {
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

  const notification = React.useMemo(
    () => ({ success, error, info, warning }),
    [success, error, info, warning],
  );

  return notification;
};

export default useNotification;
