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
  // At runtime dashboardConfig is never null -- DO NOT DO THIS usually
  dashboardConfig: null as unknown as DashboardConfig,
};

export const AppContext = React.createContext(defaultAppContext);

export const useAppContext = (): AppContextProps => React.useContext(AppContext);
