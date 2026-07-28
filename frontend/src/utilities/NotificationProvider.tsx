import React from 'react';
import { NotificationContext } from '@odh-dashboard/ui-core/contexts/NotificationContext';
import useNotification from './useNotification';

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const notification = useNotification();

  return (
    <NotificationContext.Provider value={notification}>{children}</NotificationContext.Provider>
  );
};
