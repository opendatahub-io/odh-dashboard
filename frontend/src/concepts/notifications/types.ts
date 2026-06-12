import { AlertVariant } from '@patternfly/react-core';
import * as React from 'react';

export type DashboardNotificationAction = {
  title: string;
  onClick: () => void;
};

export type DashboardNotification = {
  id?: number;
  status: AlertVariant;
  title: string;
  message?: React.ReactNode;
  hidden?: boolean;
  read?: boolean;
  timestamp: Date;
  actions?: DashboardNotificationAction[];
};

export enum DashboardNotificationActionTypes {
  ADD = 'dashboard/add_notification',
  HIDE = 'dashboard/hide_notification',
  ACK = 'dashboard/ack_notification',
  REMOVE = 'dashboard/remove_notification',
}

export type DashboardNotificationDispatchAction =
  | { type: DashboardNotificationActionTypes.ADD; payload: DashboardNotification }
  | { type: DashboardNotificationActionTypes.HIDE; payload: { id: number } }
  | { type: DashboardNotificationActionTypes.ACK; payload: { id: number } }
  | { type: DashboardNotificationActionTypes.REMOVE; payload: { id: number } };
