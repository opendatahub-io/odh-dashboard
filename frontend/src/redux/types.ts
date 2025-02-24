import { AlertVariant } from '@patternfly/react-core';
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

export interface AppNotification {
  id?: number;
  status: AlertVariant;
  title: string;
  actions?: AppNotificationAction[];
  message?: React.ReactNode;
  hidden?: boolean;
  read?: boolean;
  timestamp: Date;
}

export interface AppNotificationAction {
  title: string;
  onClick: () => void;
}

export interface GetUserAction {
  type: string;
  payload: {
    user?: string;
    userId?: string;
    clusterID?: string;
    serverURL?: string;
    clusterBranding?: string;
    dashboardNamespace?: string;
    isAdmin?: boolean;
    isAllowed?: boolean;
    error?: Error | null;
    notification?: AppNotification;
    isImpersonating?: boolean;
  };
}

export type AppState = {
  // user state
  isAdmin?: boolean;
  user?: string;
  userID?: string;
  userLoading: boolean;
  userError?: Error | null;
  isImpersonating?: boolean;

  serverURL?: string;
  clusterID?: string;
  clusterBranding?: string;
  isAllowed?: boolean;
  dashboardNamespace?: string;
  notifications: AppNotification[];
  forceComponentsUpdate: number;
};

export type StatusResponse = {
  kube: {
    currentContext: string;
    currentUser: {
      name: string;
      token: string;
    };
    namespace: string;
    userID: string;
    userName: string;
    clusterID: string;
    clusterBranding: string;
    isAdmin: boolean;
    isAllowed: boolean;
    serverURL: string;
    isImpersonating?: boolean;
  };
};
