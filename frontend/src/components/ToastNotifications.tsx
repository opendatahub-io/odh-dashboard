import React from 'react';
import { useAppSelector } from '../redux/hooks';
import { AppNotification } from '../redux/types';
import ToastNotification from './ToastNotification';

const ToastNotifications: React.FC = () => {
  const notifications: AppNotification[] = useAppSelector((state) => state.notifications);

  if (!notifications) {
    return null;
  }
  return (
    <div className="odh-dashboard__notifications">
      {notifications.map((notification) => (
        <ToastNotification notification={notification} key={notification.id} />
      ))}
    </div>
  );
};

export default ToastNotifications;
