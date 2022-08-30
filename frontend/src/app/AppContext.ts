import * as React from 'react';
import { BuildStatus, DashboardConfig } from '../types';

type AppContextProps = {
  isNavOpen: boolean;
  setIsNavOpen: (isNavOpen: boolean) => void;
  onNavToggle: () => void;
  buildStatuses: BuildStatus[];
  dashboardConfig: DashboardConfig;
};

const defaultAppContext: AppContextProps = {
  isNavOpen: true,
  setIsNavOpen: () => undefined,
  onNavToggle: () => undefined,
  buildStatuses: [],
  /* DO NOT DO THIS!!!!!!!!!!! :( */
  // dashboardConfig will never be null during runtime
  // tests will just mock this
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  dashboardConfig: null,
};

export const AppContext = React.createContext(defaultAppContext);

export const useAppContext = (): AppContextProps => React.useContext(AppContext);
