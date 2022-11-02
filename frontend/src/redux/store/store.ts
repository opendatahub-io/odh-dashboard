import { createStore, applyMiddleware, compose } from 'redux';
import reduxThunk from 'redux-thunk';
import appReducer from '../reducers/appReducer';

// eslint-disable-next-line
const composeEnhancers = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const configureStore = () => {
  return createStore(appReducer, composeEnhancers(applyMiddleware(reduxThunk)));
};

export const store = configureStore();
