import { combineReducers } from 'redux';
import appReducer from './appReducer';
import dataProjectsReducer from './dataProjectsReducer';

const rootReducer = combineReducers({
  appState: appReducer,
  dataProjectsState: dataProjectsReducer,
});

export default rootReducer;
