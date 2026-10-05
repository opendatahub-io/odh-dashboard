import React from 'react';
import { AlertGroup } from '@patternfly/react-core';
import { NotificationContext } from 'mod-arch-core';
import ToastNotification from './ToastNotification';

const ToastNotifications: React.FC = () => {
  const { notifications } = React.useContext(NotificationContext);

  return (
    <AlertGroup isToast isLiveRegion data-testid="toast-notification-group">
      {notifications.map((notification) => (
        <ToastNotification key={notification.id} notification={notification} />
      ))}
    </AlertGroup>
  );
};

export default ToastNotifications;
