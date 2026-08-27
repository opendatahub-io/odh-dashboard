import React from 'react';
import { createK8sApi, createPipelinesApi, createS3Api } from '../api';
import type { K8sApi, S3Api, PipelinesApi } from '../api';

export type AutoXApi = {
  k8s: K8sApi;
  s3: S3Api;
  pipelines: PipelinesApi;
};

export type AutoXApiProviderProps = React.PropsWithChildren<{
  apiPrefix: string;
  bffApiVersion: string;
}>;

export type AutoXApiContextValue = AutoXApi;

const AutoXApiContext = React.createContext<AutoXApiContextValue | undefined>(undefined);

export const AutoXApiProvider: React.FC<AutoXApiProviderProps> = ({
  children,
  apiPrefix,
  bffApiVersion,
}) => {
  const contextValue = React.useMemo<AutoXApiContextValue>(
    () => ({
      k8s: createK8sApi(apiPrefix, bffApiVersion),
      s3: createS3Api(apiPrefix, bffApiVersion),
      pipelines: createPipelinesApi(apiPrefix, bffApiVersion),
    }),
    [apiPrefix, bffApiVersion],
  );

  return <AutoXApiContext.Provider value={contextValue}>{children}</AutoXApiContext.Provider>;
};

export function useAutoXApi(): AutoXApiContextValue {
  const context = React.useContext(AutoXApiContext);
  if (!context) {
    throw new Error('useAutoXApi must be used within an AutoXApiProvider');
  }
  return context;
}
