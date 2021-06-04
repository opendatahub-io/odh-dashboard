import axios from 'axios';
import { getBackendURL } from '../../utilities/utils';
import { ThunkAction } from 'redux-thunk';
import { AppState, GetUserAction } from '../types';
import { Action } from 'redux';

export const GET_USER_PENDING = 'GET_USER_PENDING';
export const getUserPending = (): GetUserAction => ({
  type: GET_USER_PENDING,
  payload: {},
});

export const GET_USER_FULFILLED = 'GET_USER_FULFILLED';
export const getUserFulfilled = (response: {
  kube: { userName: string; clusterID: string };
}): GetUserAction => ({
  type: GET_USER_FULFILLED,
  payload: {
    user: response.kube.userName,
    clusterID: response.kube.clusterID,
  },
});

export const GET_USER_REJECTED = 'GET_USER_REJECTED';
export const getUserRejected = (error: Error): GetUserAction => ({
  type: GET_USER_REJECTED,
  payload: {
    error,
  },
});

export const detectUser = (): ThunkAction<void, AppState, unknown, Action<string>> => {
  const url = getBackendURL('/api/status');
  return async (dispatch) => {
    dispatch(getUserPending());
    try {
      const response = await axios.get(url, {});
      dispatch(getUserFulfilled(response.data));
    } catch (e) {
      dispatch(getUserRejected(e.response.data));
    }
  };
};
