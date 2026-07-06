import * as React from 'react';
import { ReactReduxContextValue } from 'react-redux';

export const ReduxContext = React.createContext<ReactReduxContextValue>(
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  {} as ReactReduxContextValue,
);
