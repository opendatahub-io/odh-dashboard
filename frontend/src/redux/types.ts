import * as React from 'react';

export enum Actions {
  GET_USER_PENDING = 'GET_USER_PENDING',
  GET_USER_FULFILLED = 'GET_USER_FULFILLED',
  GET_USER_REJECTED = 'GET_USER_REJECTED',
  ADD_NOTIFICATION = 'ADD_NOTIFICATION',
  HIDE_NOTIFICATION = 'HIDE_NOTIFICATION',
  ACK_NOTIFICATION = 'ACK_NOTIFICATION',
  REMOVE_NOTIFICATION = 'REMOVE_NOTIFICATION',
  FORCE_COMPONENTS_UPDATE = 'FORCE_COMPONENTS_UPDATE',
}

export type AppNotificationStatus = 'success' | 'danger' | 'warning' | 'info' | 'default';
export interface AppNotification {
  id?: number;
  status: AppNotificationStatus;
  title: string;
  message?: React.ReactNode;
  hidden?: boolean;
  read?: boolean;
  timestamp: Date;
}

export interface GetUserAction {
  type: string;
  payload: {
    user?: string;
    clusterID?: string;
    error?: Error | null;
    notification?: AppNotification;
  };
}

export interface AppState {
  user?: string;
  userLoading: boolean;
  userError?: Error | null;
  clusterID?: string;
  notifications: AppNotification[];
  forceComponentsUpdate: number;
}

export interface State {
  appState: AppState;
}
