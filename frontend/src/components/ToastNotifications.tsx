import React from 'react';
import { AlertGroup } from '@patternfly/react-core';
import { useDashboardNotificationContext } from '#~/concepts/notifications/DashboardNotificationContext';
import { DashboardNotification } from '#~/concepts/notifications/types';
import ToastNotification from './ToastNotification';

const ToastNotifications: React.FC = () => {
  const { notifications }: { notifications: DashboardNotification[] } =
    useDashboardNotificationContext();

  return (
    <AlertGroup isToast isLiveRegion data-testid="toast-notification-group">
      {notifications.map((notification) => (
        <ToastNotification notification={notification} key={notification.id} />
      ))}
    </AlertGroup>
  );
};

export default ToastNotifications;
