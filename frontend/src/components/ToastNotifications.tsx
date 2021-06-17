import React from 'react';
import { useSelector } from 'react-redux';
import { AppNotification, State } from '../redux/types';
import ToastNotification from './ToastNotification';

const ToastNotifications: React.FC = () => {
  const notifications: AppNotification[] = useSelector<State, AppNotification[]>(
    (state) => state.appState.notifications,
  );

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
