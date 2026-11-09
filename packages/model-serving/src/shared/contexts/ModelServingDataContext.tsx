import * as React from 'react';
import type { K8sAPIOptions } from '@odh-dashboard/k8s-core';
import type { GatewayOption } from '../api/gatewayDiscovery';

/** Only the Visibility API fields needed to enrich deployment queue positions. */
export type PendingDeploymentWorkloads = {
  items: { metadata: { name: string }; positionInLocalQueue: number }[];
};

/** Optional serving services supplied by the host, never by a serving spoke. */
export type ModelServingDataServices = {
  getGatewayOptions?: (namespace: string, opts?: K8sAPIOptions) => Promise<GatewayOption[]>;
  getPendingWorkloads?: (
    namespace: string,
    localQueueName: string,
    opts?: K8sAPIOptions,
  ) => Promise<PendingDeploymentWorkloads>;
};

export const ModelServingDataContext = React.createContext<ModelServingDataServices>({});
