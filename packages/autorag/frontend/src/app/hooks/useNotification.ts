import React from 'react';
import { AlertVariant } from '@patternfly/react-core';
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

type NotificationRemoveProps = (id: number | undefined) => void;

type NotificationTypeFunc = {
  [key in NotificationTypes]: NotificationProps;
};

interface NotificationFunc extends NotificationTypeFunc {
  remove: NotificationRemoveProps;
}

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
      if (id !== undefined) {
        removeNotification(id);
      }
    },
    [removeNotification],
  );

  const notification = React.useMemo(
    () => ({ success, error, info, warning, remove }),
    [success, error, info, warning, remove],
  );

  return notification;
};
