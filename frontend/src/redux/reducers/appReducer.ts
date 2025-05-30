import { Actions, AppState, GetUserAction } from '#~/redux/types';

const initialState: AppState = {
  userLoading: false,
  notifications: [],
  forceComponentsUpdate: 0,
};
//eslint-disable-next-line @typescript-eslint/default-param-last
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
        clusterBranding: '',
        serverURL: '',
        dashboardNamespace: '',
      };
    case Actions.GET_USER_FULFILLED:
      return {
        ...state,
        user: action.payload.user,
        userID: action.payload.userId,
        userLoading: false,
        userError: null,
        clusterID: action.payload.clusterID,
        clusterBranding: action.payload.clusterBranding,
        serverURL: action.payload.serverURL,
        isAdmin: action.payload.isAdmin,
        isAllowed: action.payload.isAllowed,
        dashboardNamespace: action.payload.dashboardNamespace,
        isImpersonating: action.payload.isImpersonating,
      };
    case Actions.GET_USER_REJECTED:
      return {
        ...state,
        user: '',
        userLoading: false,
        userError: action.payload.error,
        clusterID: '',
        clusterBranding: '',
        dashboardNamespace: '',
      };
    case Actions.ADD_NOTIFICATION:
      if (!action.payload.notification) {
        return state;
      }
      return {
        ...state,
        notifications: [...state.notifications, action.payload.notification],
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
