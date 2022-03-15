import axios from 'axios';
import { ThunkAction } from 'redux-thunk';
import {
  Actions,
  AppNotification,
  AppState,
  GetDataProjectsAction,
  GetUserAction,
  State,
} from '../types';
import { Action } from 'redux';
import { ProjectList } from '../../types';
import { store } from '../store/store';

export const getUserPending = (): GetUserAction => ({
  type: Actions.GET_USER_PENDING,
  payload: {},
});

export const getUserFulfilled = (response: {
  kube: { userName: string; clusterID: string; isAdmin: boolean };
}): GetUserAction => ({
  type: Actions.GET_USER_FULFILLED,
  payload: {
    user: response.kube.userName,
    clusterID: response.kube.clusterID,
    isAdmin: response.kube.isAdmin,
  },
});

export const getUserRejected = (error: Error): GetUserAction => ({
  type: Actions.GET_USER_REJECTED,
  payload: {
    error,
  },
});

export const detectUser = (): ThunkAction<void, AppState, unknown, Action<string>> => {
  const url = '/api/status';
  return async (dispatch) => {
    dispatch(getUserPending());
    try {
      const response = await axios.get(url, {});
      dispatch(getUserFulfilled(response.data));
    } catch (e: any) {  // eslint-disable-line
      dispatch(getUserRejected(e.response.data));
    }
  };
};

let notificationCount = 0;

export const addNotification = (
  notification: AppNotification,
): ThunkAction<void, AppState, unknown, Action<string>> => {
  return (dispatch) => {
    dispatch({
      type: Actions.ADD_NOTIFICATION,
      payload: { notification: { ...notification, id: ++notificationCount } },
    });
  };
};

export const hideNotification = (
  notification: AppNotification,
): ThunkAction<void, AppState, unknown, Action<string>> => {
  return (dispatch) => {
    dispatch({ type: Actions.HIDE_NOTIFICATION, payload: { notification } });
  };
};

export const ackNotification = (
  notification: AppNotification,
): ThunkAction<void, AppState, unknown, Action<string>> => {
  return (dispatch) => {
    dispatch({ type: Actions.ACK_NOTIFICATION, payload: { notification } });
  };
};

export const removeNotification = (
  notification: AppNotification,
): ThunkAction<void, AppState, unknown, Action<string>> => {
  return (dispatch) => {
    dispatch({ type: Actions.REMOVE_NOTIFICATION, payload: { notification } });
  };
};

export const forceComponentsUpdate = (): ThunkAction<void, AppState, unknown, Action<string>> => {
  return (dispatch) => {
    dispatch({
      type: Actions.FORCE_COMPONENTS_UPDATE,
    });
  };
};

export const getDataProjectsPending = (): GetDataProjectsAction => ({
  type: Actions.GET_DATA_PROJECTS_PENDING,
  payload: {},
});

export const getDataProjectsFulfilled = (dataProjects: ProjectList): GetDataProjectsAction => ({
  type: Actions.GET_DATA_PROJECTS_FULFILLED,
  payload: {
    dataProjects,
  },
});

export const getDataProjectsRejected = (error: Error): GetDataProjectsAction => ({
  type: Actions.GET_DATA_PROJECTS_REJECTED,
  payload: {
    error,
  },
});

//TODO: instead of store.getState().appState.user, we need to use session and proper auth permissions
export const getDataProjects = (): ThunkAction<void, State, unknown, Action<string>> => {
  const url = '/api/data-projects';
  const searchParams = new URLSearchParams();
  const labels = [
    'opendatahub.io/odh-managed=true',
    `opendatahub.io/user=${store.getState().appState.user}`,
  ];
  searchParams.set('labels', labels.join(','));

  const options = { params: searchParams };
  return async (dispatch) => {
    dispatch(getDataProjectsPending());
    try {
      const response = await axios.get(url, options);
      dispatch(getDataProjectsFulfilled(response.data));
    } catch (e: any) {  // eslint-disable-line
      dispatch(getDataProjectsRejected(e.response.data));
    }
  };
};
