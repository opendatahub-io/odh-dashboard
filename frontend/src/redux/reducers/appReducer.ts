import { Actions, AppState, GetUserAction } from '#~/redux/types';

const initialState: AppState = {
  userLoading: false,
  forceComponentsUpdate: 0,
};
//eslint-disable-next-line @typescript-eslint/default-param-last
const appReducer = (state: AppState = initialState, action: GetUserAction): AppState => {
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
