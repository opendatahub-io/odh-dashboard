import { SDKReducers } from '@openshift/dynamic-plugin-sdk-utils';
import { createStore, applyMiddleware, compose, combineReducers } from 'redux';
import reduxThunk from 'redux-thunk';
import appReducer from '#~/redux/reducers/appReducer';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';

const composeEnhancers =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions
  (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__?.({
    name: ODH_PRODUCT_NAME,
  }) || compose;

const configureStore = () => createStore(appReducer, composeEnhancers(applyMiddleware(reduxThunk)));

export const store = configureStore();

// Create a separate for the for the dynamic plugin SDK
const sdkComposeEnhancers =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions
  (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__?.({
    name: `${ODH_PRODUCT_NAME} - Dynamic Plugin SDK`,
  }) || compose;

export const sdkStore = createStore(
  combineReducers(SDKReducers),
  sdkComposeEnhancers(applyMiddleware(reduxThunk)),
);
