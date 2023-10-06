import * as React from 'react';
import { BuildStatus, DashboardConfig } from '~/types';
import { StorageClassKind } from '~/k8sTypes';

type AppContextProps = {
  buildStatuses: BuildStatus[];
  dashboardConfig: DashboardConfig;
  storageClasses: StorageClassKind[];
};

const defaultAppContext: AppContextProps = {
  buildStatuses: [],
  // At runtime dashboardConfig is never null -- DO NOT DO THIS usually
  dashboardConfig: null as unknown as DashboardConfig,
  storageClasses: [] as StorageClassKind[],
};

export const AppContext = React.createContext(defaultAppContext);

export const useAppContext = (): AppContextProps => React.useContext(AppContext);
