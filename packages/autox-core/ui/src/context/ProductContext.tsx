import React from 'react';
import type { K8sApi, S3Api, PipelinesApi } from '../api';
import { createK8sApi, createS3Api, createPipelinesApi } from '../api';

export type Product = 'automl' | 'autorag';

export type PipelineRunBehavior = {
  parseErrorStatus: (error: Error) => number | undefined;
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
  parseErrorStatus: PipelineRunBehavior['parseErrorStatus'];
}>;

export type ProductContextValue = {
  product: Product;
  apiPrefix: string;
  bffApiVersion: string;
  api: ProductApi;
  parseErrorStatus: PipelineRunBehavior['parseErrorStatus'];
};

const ProductContext = React.createContext<ProductContextValue | undefined>(undefined);

export const ProductContextProvider: React.FC<ProductContextProviderProps> = ({
  children,
  product,
  apiPrefix,
  bffApiVersion,
  parseErrorStatus,
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
      parseErrorStatus,
    }),
    [product, apiPrefix, bffApiVersion, parseErrorStatus],
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
