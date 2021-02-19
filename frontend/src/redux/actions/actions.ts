import axios from 'axios';
import { getBackendURL } from '../../utilities/utils';

export const GET_USER_PENDING = 'GET_USER_PENDING';
export const getUserPending = (): any => ({
  type: GET_USER_PENDING,
  payload: {},
});

export const GET_USER_FULFILLED = 'GET_USER_FULFILLED';
export const getUserFulfilled = (response) => ({
  type: GET_USER_FULFILLED,
  payload: {
    user: response.kube.currentUser,
  },
});

export const GET_USER_REJECTED = 'GET_USER_REJECTED';
export const getUserRejected = (error) => ({
  type: GET_USER_REJECTED,
  payload: {
    error,
  },
});

export const GET_COMPONENTS_PENDING = 'GET_COMPONENTS_PENDING';
export const getComponentsPending = () => ({
  type: GET_COMPONENTS_PENDING,
  payload: {},
});

export const GET_COMPONENTS_FULFILLED = 'GET_COMPONENTS_FULFILLED';
export const getComponentsFulfilled = (components) => ({
  type: GET_COMPONENTS_FULFILLED,
  payload: {
    components,
  },
});

export const GET_COMPONENTS_REJECTED = 'GET_COMPONENTS_REJECTED';
export const getComponentsRejected = (error) => ({
  type: GET_COMPONENTS_REJECTED,
  payload: {
    error,
  },
});

export const getComponents = (installed = false) => {
  const url = getBackendURL('/api/components');
  return async function (dispatch) {
    dispatch(getComponentsPending());
    const searchParams = new URLSearchParams();
    if (installed) {
      searchParams.set('installed', 'true');
    }
    const options = { params: searchParams };
    await axios
      .get(url, options)
      .then((response) => {
        dispatch(getComponentsFulfilled(response.data));
      })
      .catch((e) => {
        dispatch(getComponentsRejected(e.response.data));
      });
  };
};

export const detectUser = () => {
  const url = getBackendURL('/api/status');
  return async function (dispatch) {
    dispatch(getUserPending());
    try {
      const response = await axios.get(url, {});
      dispatch(getUserFulfilled(response.data));
    } catch (e) {
      dispatch(getUserRejected(e.response.data));
    }
  };
};
