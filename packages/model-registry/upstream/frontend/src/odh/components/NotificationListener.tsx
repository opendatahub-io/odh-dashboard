import React from 'react';
import { useNotificationListener } from '../hooks/useNotificationListener';

/**
 * Component that bridges notifications from federated module's NotificationContext to midstream
 * Uses browser custom events to communicate between the federated module and midstream React trees
 * This allows notifications triggered in the federated module (upstream) to be visible in the midstream
 */
const NotificationListener: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useNotificationListener();
  return <>{children}</>;
};

export default NotificationListener;
