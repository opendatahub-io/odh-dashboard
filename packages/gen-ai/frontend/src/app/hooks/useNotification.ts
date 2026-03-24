import React, { useContext, useRef } from 'react';
import { AlertVariant } from '@patternfly/react-core';
import { NotificationContext, NotificationActionTypes } from 'mod-arch-core';

enum NotificationTypes {
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info',
  WARNING = 'warning',
}

type NotificationProps = (title: string, message?: React.ReactNode) => void;

type NotificationRemoveProps = (id: number | undefined) => void;

type NotificationTypeFunc = {
  [key in NotificationTypes]: NotificationProps;
};

interface NotificationFunc extends NotificationTypeFunc {
  remove: NotificationRemoveProps;
}

let globalNotificationId = 0;

export const useNotification = (): NotificationFunc => {
  const { dispatch } = useContext(NotificationContext);
  const idRef = useRef<() => number>(() => ++globalNotificationId);

  const notify = React.useCallback(
    (status: AlertVariant, title: string, message?: React.ReactNode) => {
      dispatch({
        type: NotificationActionTypes.ADD_NOTIFICATION,
        payload: {
          status,
          title,
          timestamp: new Date(),
          message,
          id: idRef.current(),
        },
      });
    },
    [dispatch],
  );

  const success: NotificationProps = React.useCallback(
    (title, message) => notify(AlertVariant.success, title, message),
    [notify],
  );

  const warning: NotificationProps = React.useCallback(
    (title, message) => notify(AlertVariant.warning, title, message),
    [notify],
  );

  const error: NotificationProps = React.useCallback(
    (title, message) => notify(AlertVariant.danger, title, message),
    [notify],
  );

  const info: NotificationProps = React.useCallback(
    (title, message) => notify(AlertVariant.info, title, message),
    [notify],
  );

  const remove: NotificationRemoveProps = React.useCallback(
    (id) => {
      if (id == null) {
        return;
      }
      dispatch({
        type: NotificationActionTypes.DELETE_NOTIFICATION,
        payload: { id },
      });
    },
    [dispatch],
  );

  const notification = React.useMemo(
    () => ({ success, error, info, warning, remove }),
    [success, error, info, warning, remove],
  );

  return notification;
};
