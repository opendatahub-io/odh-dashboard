import React from 'react';
import { AlertGroup } from '@patternfly/react-core';
import { useAppSelector } from '#~/redux/hooks';
import { AppNotification } from '#~/redux/types';
import ToastNotification from './ToastNotification';

const ToastNotifications: React.FC = () => {
  const notifications: AppNotification[] = useAppSelector((state) => state.notifications);

  return (
    <AlertGroup isToast isLiveRegion>
      {notifications.map((notification) => (
        <ToastNotification notification={notification} key={notification.id} />
      ))}
    </AlertGroup>
  );
};

export default ToastNotifications;
