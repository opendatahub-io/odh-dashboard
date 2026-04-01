import React, { useContext } from 'react';
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

export const useNotification = (): NotificationFunc => {
  const { notificationCount, updateNotificationCount, dispatch } = useContext(NotificationContext);

  // Use a ref so callbacks stay stable across notification count changes.
  const countRef = React.useRef(notificationCount);
  countRef.current = notificationCount;

  const success: NotificationProps = React.useCallback(
    (title, message?) => {
      const id = ++countRef.current;
      updateNotificationCount(id);
      dispatch({
        type: NotificationActionTypes.ADD_NOTIFICATION,
        payload: {
          status: AlertVariant.success,
          title,
          timestamp: new Date(),
          message,
          id,
        },
      });
    },
    [dispatch, updateNotificationCount],
  );

  const warning: NotificationProps = React.useCallback(
    (title, message?) => {
      const id = ++countRef.current;
      updateNotificationCount(id);
      dispatch({
        type: NotificationActionTypes.ADD_NOTIFICATION,
        payload: {
          status: AlertVariant.warning,
          title,
          timestamp: new Date(),
          message,
          id,
        },
      });
    },
    [dispatch, updateNotificationCount],
  );

  const error: NotificationProps = React.useCallback(
    (title, message?) => {
      const id = ++countRef.current;
      updateNotificationCount(id);
      dispatch({
        type: NotificationActionTypes.ADD_NOTIFICATION,
        payload: {
          status: AlertVariant.danger,
          title,
          timestamp: new Date(),
          message,
          id,
        },
      });
    },
    [dispatch, updateNotificationCount],
  );

  const info: NotificationProps = React.useCallback(
    (title, message?) => {
      const id = ++countRef.current;
      updateNotificationCount(id);
      dispatch({
        type: NotificationActionTypes.ADD_NOTIFICATION,
        payload: {
          status: AlertVariant.info,
          title,
          timestamp: new Date(),
          message,
          id,
        },
      });
    },
    [dispatch, updateNotificationCount],
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
