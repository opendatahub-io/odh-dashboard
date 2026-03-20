import { AlertGroup } from '@patternfly/react-core';
import React from 'react';
import { useStore } from '~/app/store';
import ToastNotification from './ToastNotification';

const ToastNotifications: React.FC = () => {
  const notifications = useStore((state) => state.notifications);

  return (
    <AlertGroup isToast isLiveRegion data-testid="toast-notification-group-autorag">
      {notifications.map((notification) => (
        <ToastNotification notification={notification} key={notification.id} />
      ))}
    </AlertGroup>
  );
};

export default ToastNotifications;
