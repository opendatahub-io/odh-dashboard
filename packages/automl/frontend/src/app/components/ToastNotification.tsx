import React from 'react';
import { Alert, AlertActionCloseButton, AlertVariant } from '@patternfly/react-core';
import { Notification, asEnumMember } from 'mod-arch-core';
import { useNotification } from '~/app/hooks/useNotification';

const TOAST_NOTIFICATION_TIMEOUT = 8 * 1000;

interface ToastNotificationProps {
  notification: Notification;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ notification }) => {
  const notifications = useNotification();
  const notificationsRef = React.useRef(notifications);
  notificationsRef.current = notifications;

  const [mouseOver, setMouseOver] = React.useState(false);
  const remainingRef = React.useRef(TOAST_NOTIFICATION_TIMEOUT);
  const startRef = React.useRef(Date.now());

  React.useEffect(() => {
    if (mouseOver) {
      return;
    }

    startRef.current = Date.now();
    const handle = setTimeout(() => {
      if (!notification.hidden) {
        notificationsRef.current.remove(notification.id);
      }
    }, remainingRef.current);

    return () => {
      remainingRef.current -= Date.now() - startRef.current;
      clearTimeout(handle);
    };
  }, [mouseOver, notification]);

  if (notification.hidden) {
    return null;
  }

  return (
    <Alert
      variant={asEnumMember(notification.status, AlertVariant) ?? undefined}
      title={notification.title}
      actionClose={<AlertActionCloseButton onClose={() => notifications.remove(notification.id)} />}
      onMouseEnter={() => setMouseOver(true)}
      onMouseLeave={() => setMouseOver(false)}
    >
      {notification.message}
    </Alert>
  );
};

export default ToastNotification;
