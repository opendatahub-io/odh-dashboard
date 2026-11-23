import React, { useContext } from 'react';
import { AlertVariant } from '@patternfly/react-core';
import { NotificationContext, NotificationActionTypes, type Notification } from 'mod-arch-core';

type NotificationLink = Pick<Notification, 'linkUrl' | 'linkLabel'>;

type NotificationProps = (
  title: string,
  message?: React.ReactNode,
  link?: NotificationLink,
) => void;

type NotificationRemoveProps = (id: number | undefined) => void;

type NotificationTypeFunc = {
  success: NotificationProps;
  error: NotificationProps;
  info: NotificationProps;
  warning: NotificationProps;
};

interface NotificationFunc extends NotificationTypeFunc {
  remove: NotificationRemoveProps;
}

export const useNotification = (): NotificationFunc => {
  const { notificationCount, updateNotificationCount, dispatch } = useContext(NotificationContext);

  const success: NotificationProps = React.useCallback(
    (title, message?, link?) => {
      updateNotificationCount(notificationCount + 1);
      dispatch({
        type: NotificationActionTypes.ADD_NOTIFICATION,
        payload: {
          status: AlertVariant.success,
          title,
          timestamp: new Date(),
          message,
          linkUrl: link?.linkUrl,
          linkLabel: link?.linkLabel,
          id: notificationCount,
        },
      });
    },
    [dispatch, notificationCount, updateNotificationCount],
  );

  const warning: NotificationProps = React.useCallback(
    (title, message?, link?) => {
      updateNotificationCount(notificationCount + 1);
      dispatch({
        type: NotificationActionTypes.ADD_NOTIFICATION,
        payload: {
          status: AlertVariant.warning,
          title,
          timestamp: new Date(),
          message,
          linkUrl: link?.linkUrl,
          linkLabel: link?.linkLabel,
          id: notificationCount,
        },
      });
    },
    [dispatch, notificationCount, updateNotificationCount],
  );

  const error: NotificationProps = React.useCallback(
    (title, message?, link?) => {
      updateNotificationCount(notificationCount + 1);
      dispatch({
        type: NotificationActionTypes.ADD_NOTIFICATION,
        payload: {
          status: AlertVariant.danger,
          title,
          timestamp: new Date(),
          message,
          linkUrl: link?.linkUrl,
          linkLabel: link?.linkLabel,
          id: notificationCount,
        },
      });
    },
    [dispatch, notificationCount, updateNotificationCount],
  );

  const info: NotificationProps = React.useCallback(
    (title, message?, link?) => {
      updateNotificationCount(notificationCount + 1);
      dispatch({
        type: NotificationActionTypes.ADD_NOTIFICATION,
        payload: {
          status: AlertVariant.info,
          title,
          timestamp: new Date(),
          message,
          linkUrl: link?.linkUrl,
          linkLabel: link?.linkLabel,
          id: notificationCount,
        },
      });
    },
    [dispatch, notificationCount, updateNotificationCount],
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

  return React.useMemo(
    () => ({ success, error, info, warning, remove }),
    [error, info, remove, success, warning],
  );
};
