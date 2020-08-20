import {
  GET_COMPONENTS_PENDING,
  GET_COMPONENTS_FULFILLED,
  GET_COMPONENTS_REJECTED,
} from "./actions";

const initialState = {
  components: [],
  componentsLoading: false,
  componentsError: null,
};

export const reducer = (state = initialState, action) => {
  switch (action.type) {
    case GET_COMPONENTS_PENDING:
      return {
        ...state,
        components: [],
        componentsLoading: true,
        componentsError: null,
      };
    case GET_COMPONENTS_FULFILLED:
      return {
        ...state,
        components: action.payload.components,
        componentsLoading: false,
        componentsError: null,
      };
    case GET_COMPONENTS_REJECTED:
      return {
        ...state,
        components: null,
        componentsLoading: false,
        componentsError: action.payload.error,
      };
    default:
      return state;
  }
};
