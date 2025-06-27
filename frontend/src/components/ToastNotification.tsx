import React from 'react';
import {
  Alert,
  AlertActionCloseButton,
  AlertActionLink,
  AlertVariant,
} from '@patternfly/react-core';
import { AppNotification } from '#~/redux/types';
import { ackNotification, hideNotification } from '#~/redux/actions/actions';
import { useAppDispatch } from '#~/redux/hooks';
import { asEnumMember } from '#~/utilities/utils';

const TOAST_NOTIFICATION_TIMEOUT = 8 * 1000;

interface ToastNotificationProps {
  notification: AppNotification;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ notification }) => {
  const dispatch = useAppDispatch();
  const [timedOut, setTimedOut] = React.useState(false);
  const [mouseOver, setMouseOver] = React.useState(false);

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
      variant={asEnumMember(notification.status, AlertVariant) ?? undefined}
      data-testid="toast-notification-alert"
      title={notification.title}
      actionClose={
        <AlertActionCloseButton onClose={() => dispatch(ackNotification(notification))} />
      }
      actionLinks={
        notification.actions && (
          <>
            {notification.actions.map((action) => (
              <AlertActionLink key={action.title} onClick={action.onClick}>
                {action.title}
              </AlertActionLink>
            ))}
          </>
        )
      }
      onMouseEnter={() => setMouseOver(true)}
      onMouseLeave={() => setMouseOver(false)}
    >
      {notification.message}
    </Alert>
  );
};

export default ToastNotification;
