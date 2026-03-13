import { Alert, AlertActionCloseButton, AlertActionLink } from '@patternfly/react-core';
import React from 'react';
import { AppNotification, useStore } from '~/app/store';

const TOAST_NOTIFICATION_TIMEOUT = 8 * 1000;

interface ToastNotificationProps {
  notification: AppNotification;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ notification }) => {
  const { ackNotification } = useStore();

  const [timedOut, setTimedOut] = React.useState(false);
  const [mouseOver, setMouseOver] = React.useState(false);

  React.useEffect(() => {
    const handle = setTimeout(() => {
      setTimedOut(true);
    }, TOAST_NOTIFICATION_TIMEOUT);
    return () => {
      clearTimeout(handle);
    };
  }, []);

  React.useEffect(() => {
    if (!notification.hidden && timedOut && !mouseOver) {
      ackNotification(notification);
    }
  }, [ackNotification, mouseOver, notification, timedOut]);

  if (notification.hidden) {
    return null;
  }

  return (
    <Alert
      variant={notification.status}
      data-testid="toast-notification-alert"
      title={notification.title}
      actionClose={<AlertActionCloseButton onClose={() => ackNotification(notification)} />}
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
