import React, { useContext } from 'react';
import { Alert, AlertActionCloseButton, AlertGroup } from '@patternfly/react-core';
import { NotificationContext, NotificationActionTypes, Notification } from 'mod-arch-core';

const TOAST_NOTIFICATION_TIMEOUT = 8 * 1000;

const ToastAlert: React.FC<{
  notification: Notification;
  onDismiss: () => void;
}> = ({ notification, onDismiss }) => {
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
    if (timedOut && !mouseOver) {
      onDismiss();
    }
  }, [timedOut, mouseOver, onDismiss]);

  return (
    <Alert
      variant={notification.status}
      title={notification.title}
      actionClose={<AlertActionCloseButton onClose={onDismiss} />}
      onMouseEnter={() => setMouseOver(true)}
      onMouseLeave={() => setMouseOver(false)}
    >
      {notification.message}
    </Alert>
  );
};

const ToastNotifications: React.FC = () => {
  const { notifications, dispatch } = useContext(NotificationContext);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <AlertGroup isToast isLiveRegion data-testid="toast-notifications">
      {notifications.map((n) => (
        <ToastAlert
          key={n.id}
          notification={n}
          onDismiss={() =>
            dispatch({
              type: NotificationActionTypes.DELETE_NOTIFICATION,
              payload: { id: n.id },
            })
          }
        />
      ))}
    </AlertGroup>
  );
};

export default ToastNotifications;
