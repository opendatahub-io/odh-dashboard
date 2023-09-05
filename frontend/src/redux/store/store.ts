import { SDKReducers } from '@openshift/dynamic-plugin-sdk-utils';
import { createStore, applyMiddleware, compose, combineReducers } from 'redux';
import reduxThunk from 'redux-thunk';
import appReducer from '~/redux/reducers/appReducer';

const composeEnhancers =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__?.({
    name: 'Open Data Hub',
  }) || compose;

const configureStore = () => createStore(appReducer, composeEnhancers(applyMiddleware(reduxThunk)));

export const store = configureStore();

// Create a separate for the for the dynamic plugin SDK
const sdkComposeEnhancers =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__?.({
    name: 'Open Data Hub - Dynamic Plugin SDK',
  }) || compose;

export const sdkStore = createStore(
  combineReducers(SDKReducers),
  sdkComposeEnhancers(applyMiddleware(reduxThunk)),
);
