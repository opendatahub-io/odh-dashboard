import { createStore, applyMiddleware, compose } from 'redux';
import reduxThunk from 'redux-thunk';
import rootReducer from '../reducers/rootReducers';

const composeEnhancers =
  (window['__REDUX_DEVTOOLS_EXTENSION_COMPOSE__'] as typeof compose) || compose;

const configureStore = () => {
  return createStore(rootReducer, composeEnhancers(applyMiddleware(reduxThunk)));
};

export const store = configureStore();
