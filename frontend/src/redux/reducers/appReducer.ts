import {
  GET_USER_PENDING,
  GET_USER_FULFILLED,
  GET_USER_REJECTED,
  GET_COMPONENTS_PENDING,
  GET_COMPONENTS_FULFILLED,
  GET_COMPONENTS_REJECTED,
} from '../actions/actions';

const initialState = {
  user: {},
  userLoading: false,
  userError: null,
  components: [],
  componentsLoading: false,
  componentsError: null,
};

const appReducer = (state = initialState, action) => {
  switch (action.type) {
    case GET_USER_PENDING:
      return {
        ...state,
        user: [],
        userLoading: true,
        userError: null,
      };
    case GET_USER_FULFILLED:
      return {
        ...state,
        user: action.payload.user,
        userLoading: false,
        userError: null,
      };
    case GET_USER_REJECTED:
      return {
        ...state,
        user: null,
        userLoading: false,
        userError: action.payload.error,
      };
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

export default appReducer;
