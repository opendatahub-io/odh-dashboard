import React from 'react';
import { Alert, AlertActionCloseButton, AlertVariant } from '@patternfly/react-core';
import { useDispatch } from 'react-redux';
import { AppNotification } from '../redux/types';
import { ackNotification, hideNotification } from '../redux/actions/actions';

const TOAST_NOTIFICATION_TIMEOUT = 8 * 1000;

interface ToastNotificationProps {
  notification: AppNotification;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ notification }) => {
  const dispatch = useDispatch();
  const [timedOut, setTimedOut] = React.useState<boolean>(false);
  const [mouseOver, setMouseOver] = React.useState<boolean>(false);

  React.useEffect(() => {
    const handle = setTimeout(() => {
      setTimedOut(true);
    }, TOAST_NOTIFICATION_TIMEOUT);
    return () => {
      clearTimeout(handle);
    };
  }, [setTimedOut]);

  React.useEffect(() => {
    if (!notification.hidden && timedOut && !mouseOver) {
      dispatch(hideNotification(notification));
    }
  }, [dispatch, mouseOver, notification, timedOut]);

  if (notification.hidden) {
    return null;
  }

  return (
    <Alert
      variant={notification.status as AlertVariant}
      title={notification.title}
      actionClose={
        <AlertActionCloseButton onClose={() => dispatch(ackNotification(notification))} />
      }
      onMouseEnter={() => setMouseOver(true)}
      onMouseLeave={() => setMouseOver(false)}
    >
      {notification.message}
    </Alert>
  );
};

export default ToastNotification;
