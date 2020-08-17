import { combineReducers } from "redux";
import { reducer as appReducer } from "../App";

const rootReducer = combineReducers({
  appReducer,
});

export default rootReducer;
