import { combineReducers } from 'redux';
import appReducer from './appReducer';

const rootReducer = combineReducers({
  appReducer,
});

export default rootReducer;
