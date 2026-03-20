import { Alert, AlertActionCloseButton, AlertActionLink } from '@patternfly/react-core';
import React from 'react';
import { AppNotification, useStore } from '~/app/store';

const TOAST_NOTIFICATION_TIMEOUT = 8 * 1000;

interface ToastNotificationProps {
  notification: AppNotification;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ notification }) => {
  const { removeNotification } = useStore();

  const [timedOut, setTimedOut] = React.useState(false);
  const [mouseOver, setMouseOver] = React.useState(false);
  const [focusWithin, setFocusWithin] = React.useState(false);

  React.useEffect(() => {
    const handle = setTimeout(() => {
      setTimedOut(true);
    }, TOAST_NOTIFICATION_TIMEOUT);
    return () => {
      clearTimeout(handle);
    };
  }, []);

  React.useEffect(() => {
    if (timedOut && !mouseOver && !focusWithin) {
      removeNotification(notification.id);
    }
  }, [focusWithin, mouseOver, notification, removeNotification, timedOut]);

  return (
    <Alert
      variant={notification.status}
      data-testid="toast-notification-alert"
      title={notification.title}
      actionClose={<AlertActionCloseButton onClose={() => removeNotification(notification.id)} />}
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
      onFocus={() => setFocusWithin(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocusWithin(false);
        }
      }}
    >
      {notification.message}
    </Alert>
  );
};

export default ToastNotification;
