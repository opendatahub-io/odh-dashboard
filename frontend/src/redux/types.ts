export enum Actions {
  GET_USER_PENDING = 'GET_USER_PENDING',
  GET_USER_FULFILLED = 'GET_USER_FULFILLED',
  GET_USER_REJECTED = 'GET_USER_REJECTED',
  FORCE_COMPONENTS_UPDATE = 'FORCE_COMPONENTS_UPDATE',
}

/**
 * @deprecated Use DashboardNotification from '#~/concepts/notifications/types' instead.
 * Kept for backward compatibility during migration.
 */
export type { DashboardNotification as AppNotification } from '#~/concepts/notifications/types';

/**
 * @deprecated Use DashboardNotificationAction from '#~/concepts/notifications/types' instead.
 * Kept for backward compatibility during migration.
 */
export type { DashboardNotificationAction as AppNotificationAction } from '#~/concepts/notifications/types';

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
