import * as React from 'react';
import { blankDashboardCR } from '../utilities/useWatchDashboardConfig';
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
  dashboardConfig: blankDashboardCR,
};

const AppContext = React.createContext(defaultAppContext);

export default AppContext;
