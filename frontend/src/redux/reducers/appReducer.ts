import { AppState, GetUserAction } from '../types';
import { GET_USER_PENDING, GET_USER_FULFILLED, GET_USER_REJECTED } from '../actions/actions';

const initialState: AppState = {
  userLoading: false,
};

const appReducer = (state: AppState = initialState, action: GetUserAction): AppState => {
  switch (action.type) {
    case GET_USER_PENDING:
      return {
        ...state,
        user: '',
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
        user: '',
        userLoading: false,
        userError: action.payload.error,
      };
    default:
      return state;
  }
};

export default appReducer;
