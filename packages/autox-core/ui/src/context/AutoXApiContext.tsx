import React from 'react';
import { createSecret } from '@odh-dashboard/k8s-core/api/secrets';
import { createK8sApi } from '../api/k8s/k8s';
import { createPipelinesApi } from '../api/pipelines/pipelines';
import { createS3Api } from '../api/s3/s3';
import type { K8sApi } from '../api/k8s/k8s';
import type { PipelinesApi } from '../api/pipelines/pipelines';
import type { S3Api } from '../api/s3/s3';

type AutoXApi = {
  k8s: K8sApi & { createSecret: typeof createSecret };
  s3: S3Api;
  pipelines: PipelinesApi;
};

export type AutoXApiProviderProps = React.PropsWithChildren<{
  apiPrefix: string;
  bffApiVersion: string;
}>;

type AutoXApiContextValue = AutoXApi;

const AutoXApiContext = React.createContext<AutoXApiContextValue | undefined>(undefined);

export const AutoXApiProvider: React.FC<AutoXApiProviderProps> = ({
  children,
  apiPrefix,
  bffApiVersion,
}) => {
  const contextValue = React.useMemo<AutoXApiContextValue>(
    () => ({
      k8s: { ...createK8sApi(apiPrefix, bffApiVersion), createSecret },
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
