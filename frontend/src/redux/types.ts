import * as React from 'react';
import { Project, ProjectList } from '../types';

export enum Actions {
  GET_USER_PENDING = 'GET_USER_PENDING',
  GET_USER_FULFILLED = 'GET_USER_FULFILLED',
  GET_USER_REJECTED = 'GET_USER_REJECTED',
  ADD_NOTIFICATION = 'ADD_NOTIFICATION',
  HIDE_NOTIFICATION = 'HIDE_NOTIFICATION',
  ACK_NOTIFICATION = 'ACK_NOTIFICATION',
  REMOVE_NOTIFICATION = 'REMOVE_NOTIFICATION',
  FORCE_COMPONENTS_UPDATE = 'FORCE_COMPONENTS_UPDATE',
  GET_DATA_PROJECTS_PENDING = 'dataProjects.GET_DATA_PROJECTS_PENDING',
  GET_DATA_PROJECTS_FULFILLED = 'dataProjects.GET_DATA_PROJECTS_FULFILLED',
  GET_DATA_PROJECTS_REJECTED = 'dataProjects.GET_DATA_PROJECTS_REJECTED',
  CREATE_DATA_PROJECT_PENDING = 'dataProjects.CREATE_DATA_PROJECT_PENDING',
  CREATE_DATA_PROJECT_FULFILLED = 'dataProjects.CREATE_DATA_PROJECT_FULFILLED',
  CREATE_DATA_PROJECT_REJECTED = 'dataProjects.CREATE_DATA_PROJECT_REJECTED',
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
    isAdmin?: boolean;
    error?: Error | null;
    notification?: AppNotification;
  };
}

export interface AppState {
  user?: string;
  userLoading: boolean;
  userError?: Error | null;
  clusterID?: string;
  isAdmin?: boolean;
  notifications: AppNotification[];
  forceComponentsUpdate: number;
}

export interface GetDataProjectsAction {
  type: string;
  payload: {
    dataProjects?: ProjectList | null;
    error?: Error | null;
  };
}

export interface CreateDataProjectAction {
  type: string;
  payload: {
    dataProject?: Project | null;
    error?: Error | null;
  };
}

export interface DataProjectsState {
  dataProjects?: ProjectList | null;
  dataProjectsLoading: boolean;
  dataProjectsError?: Error | null;
}

export interface State {
  appState: AppState;
  dataProjectsState: DataProjectsState;
}
