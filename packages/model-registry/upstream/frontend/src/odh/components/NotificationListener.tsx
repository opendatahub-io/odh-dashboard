import React from 'react';
import { useNotificationListener } from '../hooks/useNotificationListener';

/**
 * TODO: TECH DEBT - Temporary workaround component
 * 
 * Component that bridges notifications from federated module's NotificationContext to midstream
 * Uses browser custom events to communicate between the federated module and midstream React trees
 * This allows notifications triggered in the federated module (upstream) to be visible in the midstream
 * 
 * FUTURE WORK: Remove this component once midstream uses mod-arch-core's NotificationContext
 * Related: [JIRA ticket to be created]
 */
const NotificationListener: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useNotificationListener();
  return <>{children}</>;
};

export default NotificationListener;
