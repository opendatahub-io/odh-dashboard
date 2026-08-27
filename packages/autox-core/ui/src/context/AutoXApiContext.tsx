import React from 'react';
import type { K8sApi, S3Api, PipelinesApi } from '../api';

export type AutoXApi = {
  k8s: K8sApi;
  s3: S3Api;
  pipelines: PipelinesApi;
};

export type AutoXApiProviderProps = React.PropsWithChildren<{
  api: AutoXApi;
}>;

export type AutoXApiContextValue = AutoXApi;

const AutoXApiContext = React.createContext<AutoXApiContextValue | undefined>(undefined);

export const AutoXApiProvider: React.FC<AutoXApiProviderProps> = ({ children, api }) => {
  const contextValue = React.useMemo<AutoXApiContextValue>(() => api, [api]);

  return <AutoXApiContext.Provider value={contextValue}>{children}</AutoXApiContext.Provider>;
};

export function useAutoXApi(): AutoXApiContextValue {
  const context = React.useContext(AutoXApiContext);
  if (!context) {
    throw new Error('useAutoXApi must be used within an AutoXApiProvider');
  }
  return context;
}
