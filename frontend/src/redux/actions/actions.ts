import { ThunkAction } from 'redux-thunk';
import { Action } from 'redux';
import axios from '#~/utilities/axios';
import { Actions, AppNotification, AppState, GetUserAction, StatusResponse } from '#~/redux/types';
import { AllowedUser } from '#~/pages/notebookController/screens/admin/types';

export const getUserPending = (): GetUserAction => ({
  type: Actions.GET_USER_PENDING,
  payload: {},
});

export const getUserFulfilled = (response: StatusResponse): GetUserAction => ({
  type: Actions.GET_USER_FULFILLED,
  payload: {
    userId: response.kube.userID,
    user: response.kube.userName,
    clusterID: response.kube.clusterID,
    clusterBranding: response.kube.clusterBranding,
    isAdmin: response.kube.isAdmin,
    isAllowed: response.kube.isAllowed,
    dashboardNamespace: response.kube.namespace,
    isImpersonating: response.kube.isImpersonating,
    serverURL: response.kube.serverURL,
  },
});

export const getUserRejected = (error: Error): GetUserAction => ({
  type: Actions.GET_USER_REJECTED,
  payload: {
    error,
  },
});

export const getAllowedUsers = (notebookNamespace: string): Promise<AllowedUser[]> => {
  const url = `/api/status/${notebookNamespace}/allowedUsers`;
  return axios.get(url).then((response) => response.data);
};

let notificationCount = 0;

export const addNotification =
  (notification: AppNotification): ThunkAction<void, AppState, unknown, Action<string>> =>
  (dispatch) => {
    dispatch({
      type: Actions.ADD_NOTIFICATION,
      payload: { notification: { ...notification, id: ++notificationCount } },
    });
  };

export const hideNotification =
  (notification: AppNotification): ThunkAction<void, AppState, unknown, Action<string>> =>
  (dispatch) => {
    dispatch({ type: Actions.HIDE_NOTIFICATION, payload: { notification } });
  };

export const ackNotification =
  (notification: AppNotification): ThunkAction<void, AppState, unknown, Action<string>> =>
  (dispatch) => {
    dispatch({ type: Actions.ACK_NOTIFICATION, payload: { notification } });
  };

export const removeNotification =
  (notification: AppNotification): ThunkAction<void, AppState, unknown, Action<string>> =>
  (dispatch) => {
    dispatch({ type: Actions.REMOVE_NOTIFICATION, payload: { notification } });
  };

export const forceComponentsUpdate =
  (): ThunkAction<void, AppState, unknown, Action<string>> => (dispatch) => {
    dispatch({
      type: Actions.FORCE_COMPONENTS_UPDATE,
    });
  };
