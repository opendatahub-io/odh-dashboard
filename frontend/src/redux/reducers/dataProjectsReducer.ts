import { Actions, DataProjectsState, GetDataProjectsAction } from '../types';

const initialState: DataProjectsState = {
  dataProjects: null,
  dataProjectsLoading: false,
  dataProjectsError: null,
};

const dataProjectsReducer = (
  state: DataProjectsState = initialState,
  action: GetDataProjectsAction,
): DataProjectsState => {
  switch (action.type) {
    case Actions.GET_DATA_PROJECTS_PENDING:
      return {
        ...state,
        dataProjects: null,
        dataProjectsLoading: true,
        dataProjectsError: null,
      };
    case Actions.GET_DATA_PROJECTS_FULFILLED:
      return {
        ...state,
        dataProjects: action.payload.dataProjects,
        dataProjectsLoading: false,
        dataProjectsError: null,
      };
    case Actions.GET_DATA_PROJECTS_REJECTED:
      return {
        ...state,
        dataProjects: null,
        dataProjectsLoading: false,
        dataProjectsError: action.payload.error,
      };
    default:
      return state;
  }
};

export default dataProjectsReducer;
