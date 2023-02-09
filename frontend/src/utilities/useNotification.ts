import * as React from 'react';
import { addNotification } from '../redux/actions/actions';
import { useAppDispatch } from '../redux/hooks';

type NotificationProps = (title: string, message?: React.ReactNode) => void;

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
  const dispatch = useAppDispatch();
  const success: NotificationProps = React.useCallback(
    (title, message) => {
      dispatch(
        addNotification({
          status: 'success',
          title,
          message,
          timestamp: new Date(),
        }),
      );
    },
    [dispatch],
  );

  const error: NotificationProps = React.useCallback(
    (title, message?) => {
      dispatch(
        addNotification({
          status: 'danger',
          title,
          message,
          timestamp: new Date(),
        }),
      );
    },
    [dispatch],
  );

  const info: NotificationProps = React.useCallback(
    (title, message?) => {
      dispatch(
        addNotification({
          status: 'info',
          title,
          message,
          timestamp: new Date(),
        }),
      );
    },
    [dispatch],
  );

  const warning: NotificationProps = React.useCallback(
    (title, message?) => {
      dispatch(
        addNotification({
          status: 'warning',
          title,
          message,
          timestamp: new Date(),
        }),
      );
    },
    [dispatch],
  );

  const notification = React.useMemo(
    () => ({ success, error, info, warning }),
    [success, error, info, warning],
  );

  return notification;
};

export default useNotification;
