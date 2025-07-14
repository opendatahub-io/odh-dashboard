import * as React from 'react';
import { DashboardConfigKind, StorageClassKind } from '#~/k8sTypes';
import { BuildStatus } from '#~/types';

type AppContextProps = {
  buildStatuses: BuildStatus[];
  dashboardConfig: DashboardConfigKind;
  workbenchNamespace?: string;
  storageClasses: StorageClassKind[];
  isRHOAI: boolean;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
export const AppContext = React.createContext({} as AppContextProps);

export const useAppContext = (): AppContextProps => React.useContext(AppContext);
