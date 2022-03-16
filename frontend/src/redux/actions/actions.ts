import axios from 'axios';
import { ThunkAction } from 'redux-thunk';
import { Actions, AppNotification, AppState, GetUserAction } from '../types';
import { Action } from 'redux';

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
