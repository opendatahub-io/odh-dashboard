import React, { useContext } from 'react';
import { AlertGroup } from '@patternfly/react-core';
import { NotificationContext } from 'mod-arch-core';
import ToastNotification from '~/app/components/ToastNotification';

const ToastNotifications: React.FC = () => {
  const { notifications } = useContext(NotificationContext);

  return (
    <AlertGroup isToast isLiveRegion data-testid="toast-notification-group">
      {notifications.map((notification) => (
        <ToastNotification notification={notification} key={notification.id} />
      ))}
    </AlertGroup>
  );
};

export default ToastNotifications;
