import * as React from 'react';

export enum Actions {
  GET_USER_PENDING = 'GET_USER_PENDING',
  GET_USER_FULFILLED = 'GET_USER_FULFILLED',
  GET_USER_REJECTED = 'GET_USER_REJECTED',
  ADD_NOTIFICATION = 'ADD_NOTIFICATION',
  HIDE_NOTIFICATION = 'HIDE_NOTIFICATION',
  ACK_NOTIFICATION = 'ACK_NOTIFICATION',
  REMOVE_NOTIFICATION = 'REMOVE_NOTIFICATION',
}

export interface AppNotification {
  id?: number;
  status: 'success' | 'danger' | 'warning' | 'info' | 'default';
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
    error?: Error | null;
    notification?: AppNotification;
  };
}

export interface AppState {
  user?: string;
  userLoading: boolean;
  userError?: Error | null;
  notifications: AppNotification[];
  forceComponentsUpdate: number;
}

export interface State {
  appState: AppState;
}
