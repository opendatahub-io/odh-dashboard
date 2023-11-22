import * as React from 'react';
import { ReactReduxContextValue } from 'react-redux';

export const ReduxContext = React.createContext<ReactReduxContextValue>(
  {} as ReactReduxContextValue,
);
