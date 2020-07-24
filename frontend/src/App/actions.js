import ky from "ky";

export const GET_COMPONENTS_PENDING = "GET_COMPONENTS_PENDING";
export const getComponentsPending = () => ({
  type: GET_COMPONENTS_PENDING,
  payload: {},
});

export const GET_COMPONENTS_FULFILLED = "GET_COMPONENTS_FULFILLED";
export const getComponentsFulfilled = (components) => ({
  type: GET_COMPONENTS_FULFILLED,
  payload: {
    components,
  },
});

export const GET_COMPONENTS_REJECTED = "GET_COMPONENTS_REJECTED";
export const getComponentsRejected = (error) => ({
  type: GET_COMPONENTS_REJECTED,
  payload: {
    error,
  },
});

export const getComponents = () => {
  let url = `/api/components`;
  return async function (dispatch) {
    dispatch(getComponentsPending());
    try {
      const response = await ky.get(url, {}).json();
      console.log(response);
      dispatch(getComponentsFulfilled(response));
    } catch (e) {
      dispatch(getComponentsRejected(e));
    }
  };
};

export default getComponents;
