import React from 'react';
import { AlertGroup } from '@patternfly/react-core';
import ToastNotification from './ToastNotification';
import { useAppSelector } from '#~/redux/hooks';
import { AppNotification } from '#~/redux/types';

const ToastNotifications: React.FC = () => {
  const notifications: AppNotification[] = useAppSelector((state) => state.notifications);

  return (
    <AlertGroup isToast isLiveRegion data-testid="toast-notification-group" hasAnimations>
      {notifications.map((notification) => (
        <ToastNotification notification={notification} key={notification.id} />
      ))}
    </AlertGroup>
  );
};

export default ToastNotifications;
