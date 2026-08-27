import React from 'react';
import { AutoXApiProvider } from '@odh-dashboard/autox-core/ui/context';
import { k8sApi } from '~/app/api/k8s';
import { s3Api } from '~/app/api/s3';
import { pipelinesApi } from '~/app/api/pipelines';

export const ProductProvider: React.FC<React.PropsWithChildren> = ({ children }) => (
  <AutoXApiProvider api={{ k8s: k8sApi, s3: s3Api, pipelines: pipelinesApi }}>
    {children}
  </AutoXApiProvider>
);
