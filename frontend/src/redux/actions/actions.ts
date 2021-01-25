import axios from 'axios';
import { getBackendURL } from './utils';

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

export const getComponents = () => {
  const url = getBackendURL('/api/components');
  return async function (dispatch) {
    dispatch(getComponentsPending());
    await axios.get(url, {}).then(response => {
      dispatch(getComponentsFulfilled(response.data));
    }).catch (e => {
      dispatch(getComponentsRejected(e.response.data));
    });
  };
};

export default getComponents;
