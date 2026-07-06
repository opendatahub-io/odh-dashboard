import * as React from 'react';
import { k8sGetResource, K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import useFetch, { FetchStateObject } from '@odh-dashboard/internal/utilities/useFetch';
import { ClusterVersionModel, InfrastructureModel } from './models';

/**
 * Cluster details fetched from OpenShift ClusterVersion and Infrastructure resources
 */
export type ClusterDetails = {
  openshiftVersion: string;
  infrastructureProvider: string;
};

/**
 * OpenShift ClusterVersion resource type
 */
type ClusterVersionKind = K8sResourceCommon & {
  status?: { desired?: { version?: string } };
};

/**
 * OpenShift Infrastructure resource type
 */
type InfrastructureKind = K8sResourceCommon & {
  status?: {
    platformStatus?: {
      type?: string;
    };
  };
};

const DEFAULT_CLUSTER_DETAILS: ClusterDetails = {
  openshiftVersion: 'Unknown',
  infrastructureProvider: 'Unknown',
};

/**
 * Fetches cluster details from the OpenShift ClusterVersion and Infrastructure resources
 */
const fetchClusterDetails = async (): Promise<ClusterDetails> => {
  const [clusterVersion, infrastructure] = await Promise.all([
    k8sGetResource<ClusterVersionKind>({
      model: ClusterVersionModel,
      queryOptions: { name: 'version' },
    }).catch(() => null),
    k8sGetResource<InfrastructureKind>({
      model: InfrastructureModel,
      queryOptions: { name: 'cluster' },
    }).catch(() => null),
  ]);

  // Extract OpenShift version from the ClusterVersion resource
  const openshiftVersion = clusterVersion?.status?.desired?.version ?? 'Unknown';

  // Extract infrastructure provider type
  const infrastructureProvider = infrastructure?.status?.platformStatus?.type ?? 'Unknown';

  return {
    openshiftVersion,
    infrastructureProvider,
  };
};

/**
 * Hook to fetch cluster details (OpenShift version, infrastructure provider)
 */
export const useClusterDetails = (): FetchStateObject<ClusterDetails> => {
  const fetchCallback = React.useCallback(() => fetchClusterDetails(), []);
  return useFetch(fetchCallback, DEFAULT_CLUSTER_DETAILS);
};
