import React from 'react';
import { AlertGroup } from '@patternfly/react-core';
import { NotificationsContext } from '~/app/NotificationsContext';
import ToastNotification from './ToastNotification';

const GlobalToastNotifications: React.FC = () => {
  const { notifications } = React.useContext(NotificationsContext);

  if (!notifications) {
    return null;
  }

  return (
    <AlertGroup isToast isLiveRegion>
      {notifications.map((notification) => (
        <ToastNotification notification={notification} key={notification.id} />
      ))}
    </AlertGroup>
  );
};

export default GlobalToastNotifications;
