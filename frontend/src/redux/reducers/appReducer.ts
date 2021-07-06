import { Actions, AppState, GetUserAction } from '../types';

const initialState: AppState = {
  userLoading: false,
  notifications: [],
  forceComponentsUpdate: 0,
};

const appReducer = (state: AppState = initialState, action: GetUserAction): AppState => {
  let index;
  switch (action.type) {
    case Actions.GET_USER_PENDING:
      return {
        ...state,
        user: '',
        userLoading: true,
        userError: null,
        clusterID: '',
      };
    case Actions.GET_USER_FULFILLED:
      return {
        ...state,
        user: action.payload.user,
        userLoading: false,
        userError: null,
        clusterID: action.payload.clusterID,
      };
    case Actions.GET_USER_REJECTED:
      return {
        ...state,
        user: '',
        userLoading: false,
        userError: action.payload.error,
        clusterID: '',
      };
    case Actions.ADD_NOTIFICATION:
      if (!action.payload.notification) {
        return state;
      }
      return {
        ...state,
        notifications: [...(state.notifications || []), action.payload.notification],
      };
    case Actions.HIDE_NOTIFICATION:
      if (!action.payload.notification) {
        return state;
      }
      index = state.notifications.findIndex((n) => n.id === action.payload.notification?.id);
      if (index === -1) {
        return state;
      }
      return {
        ...state,
        notifications: [
          ...state.notifications.slice(0, index),
          { ...state.notifications[index], hidden: true },
          ...state.notifications.slice(index + 1),
        ],
      };
    case Actions.ACK_NOTIFICATION:
      if (!action.payload.notification) {
        return state;
      }
      index = state.notifications.findIndex((n) => n.id === action.payload.notification?.id);
      if (index === -1) {
        return state;
      }
      return {
        ...state,
        notifications: [
          ...state.notifications.slice(0, index),
          { ...state.notifications[index], read: true, hidden: true },
          ...state.notifications.slice(index + 1),
        ],
      };
    case Actions.REMOVE_NOTIFICATION:
      if (!action.payload.notification) {
        return state;
      }
      index = state.notifications.findIndex((n) => n.id === action.payload.notification?.id);
      if (index === -1) {
        return state;
      }
      return {
        ...state,
        notifications: [
          ...state.notifications.slice(0, index),
          ...state.notifications.slice(index + 1),
        ],
      };
    case Actions.FORCE_COMPONENTS_UPDATE:
      return {
        ...state,
        forceComponentsUpdate: state.forceComponentsUpdate + 1,
      };
    default:
      return state;
  }
};

export default appReducer;
