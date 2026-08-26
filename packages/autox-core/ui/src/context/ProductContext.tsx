import React from 'react';
import type { K8sApi, S3Api, PipelinesApi, PipelineRun } from '../api';
import { createK8sApi, createS3Api, createPipelinesApi } from '../api';

export type Product = 'automl' | 'autorag';

export type PipelineRunBehavior = {
  isRunInTerminalState: (state: unknown) => boolean;
  parseErrorStatus: (error: Error) => number | undefined;
  normalize?: (run: PipelineRun) => PipelineRun;
};

export type ProductApi = {
  k8s: K8sApi;
  s3: S3Api;
  pipelines: PipelinesApi;
};

export type ProductContextProviderProps = React.PropsWithChildren<{
  product: Product;
  apiPrefix: string;
  bffApiVersion: string;
  isRunInTerminalState: PipelineRunBehavior['isRunInTerminalState'];
  parseErrorStatus: PipelineRunBehavior['parseErrorStatus'];
  normalize?: PipelineRunBehavior['normalize'];
}>;

export type ProductContextValue = {
  product: Product;
  apiPrefix: string;
  bffApiVersion: string;
  api: ProductApi;
  isRunInTerminalState: PipelineRunBehavior['isRunInTerminalState'];
  parseErrorStatus: PipelineRunBehavior['parseErrorStatus'];
  normalize?: PipelineRunBehavior['normalize'];
};

const ProductContext = React.createContext<ProductContextValue | undefined>(undefined);

export const ProductContextProvider: React.FC<ProductContextProviderProps> = ({
  children,
  product,
  apiPrefix,
  bffApiVersion,
  isRunInTerminalState,
  parseErrorStatus,
  normalize,
}) => {
  const contextValue = React.useMemo<ProductContextValue>(
    () => ({
      product,
      apiPrefix,
      bffApiVersion,
      api: {
        k8s: createK8sApi(apiPrefix, bffApiVersion),
        s3: createS3Api(apiPrefix, bffApiVersion),
        pipelines: createPipelinesApi(apiPrefix, bffApiVersion),
      },
      isRunInTerminalState,
      parseErrorStatus,
      normalize,
    }),
    [product, apiPrefix, bffApiVersion, isRunInTerminalState, parseErrorStatus, normalize],
  );

  return <ProductContext.Provider value={contextValue}>{children}</ProductContext.Provider>;
};

export function useProductContext(): ProductContextValue {
  const context = React.useContext(ProductContext);
  if (!context) {
    throw new Error('useProductContext must be used within a ProductContextProvider');
  }
  return context;
}
