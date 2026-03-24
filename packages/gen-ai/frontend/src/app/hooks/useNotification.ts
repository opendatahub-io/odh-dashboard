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

type NotificationRemoveProps = (id: number) => void;

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

  const success: NotificationProps = React.useCallback(
    (title, message) => {
      dispatch({
        type: NotificationActionTypes.ADD_NOTIFICATION,
        payload: {
          status: AlertVariant.success,
          title,
          timestamp: new Date(),
          message,
          id: idRef.current(),
        },
      });
    },
    [dispatch],
  );

  const warning: NotificationProps = React.useCallback(
    (title, message) => {
      dispatch({
        type: NotificationActionTypes.ADD_NOTIFICATION,
        payload: {
          status: AlertVariant.warning,
          title,
          timestamp: new Date(),
          message,
          id: idRef.current(),
        },
      });
    },
    [dispatch],
  );

  const error: NotificationProps = React.useCallback(
    (title, message) => {
      dispatch({
        type: NotificationActionTypes.ADD_NOTIFICATION,
        payload: {
          status: AlertVariant.danger,
          title,
          timestamp: new Date(),
          message,
          id: idRef.current(),
        },
      });
    },
    [dispatch],
  );

  const info: NotificationProps = React.useCallback(
    (title, message) => {
      dispatch({
        type: NotificationActionTypes.ADD_NOTIFICATION,
        payload: {
          status: AlertVariant.info,
          title,
          timestamp: new Date(),
          message,
          id: idRef.current(),
        },
      });
    },
    [dispatch],
  );

  const remove: NotificationRemoveProps = React.useCallback(
    (id) => {
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
