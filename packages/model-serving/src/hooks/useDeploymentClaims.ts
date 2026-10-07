import * as React from 'react';
import type { PodKind } from '@odh-dashboard/k8s-core';
import {
  getClaimLookupNames,
  getPodClaimReferences,
  hasDeclaredClaims,
} from '@odh-dashboard/hardware-profiles/shared/dra/claimResolution';
import type { WorkloadClaimGroup } from '@odh-dashboard/hardware-profiles/shared/dra/types';
import { useResourceClaimLookups } from '@odh-dashboard/hardware-profiles/shared/dra/useResourceClaimLookups';
import {
  isLivePod,
  resolveWorkloadClaims,
} from '@odh-dashboard/hardware-profiles/shared/dra/workloadClaims';
import type { Deployment } from '../../extension-points';

type UseDeploymentClaimsOptions = {
  /** Gate every lookup on the row being expanded. */
  enabled: boolean;
  /** Poll the RC/RCT lookups while enabled; 0 fetches once. */
  refreshRate?: number;
};

export type DeploymentClaimsState = {
  /** True once a live Pod declares a claim; non-DRA deployments never fetch. */
  hasClaims: boolean;
  podsLoaded: boolean;
  podsError?: Error;
  /** One group per live Pod that declares claims, in Pod-name order. */
  groups: WorkloadClaimGroup[];
  /** The platform's model server containers; other consumers are still listed. */
  containerNames?: string[];
};

const EMPTY_PODS: PodKind[] = [];

/** Live Pods that declare claims, in name order so replicas keep a stable position. */
export const selectClaimPods = (pods: PodKind[]): PodKind[] =>
  pods
    .filter((pod) => isLivePod(pod) && hasDeclaredClaims(pod.spec))
    .toSorted((a, b) =>
      a.metadata.name.localeCompare(b.metadata.name, undefined, { numeric: true }),
    );

/** Claims of every platform-selected Pod, resolved against one shared RC/RCT lookup. */
export const useDeploymentClaims = (
  deployment: Deployment,
  { enabled, refreshRate = 0 }: UseDeploymentClaimsOptions,
): DeploymentClaimsState => {
  const { namespace } = deployment.model.metadata;
  const data = deployment.pods?.data ?? EMPTY_PODS;
  const podsLoaded = deployment.pods?.loaded ?? false;
  const podsError = deployment.pods?.error;
  const containerNames = deployment.pods?.containerNames;
  const podDescriptions = deployment.pods?.podDescriptions;

  const pods = React.useMemo(() => selectClaimPods(data), [data]);
  const hasClaims = pods.length > 0;
  // Names are deduplicated across Pods so a shared direct claim is fetched once.
  const { claimNames, templateNames } = React.useMemo(
    () => getClaimLookupNames(pods.flatMap((pod) => getPodClaimReferences(pod))),
    [pods],
  );
  const lookups = useResourceClaimLookups({
    namespace,
    claimNames,
    templateNames,
    enabled: enabled && hasClaims,
    // A non-DRA row arms no poll interval.
    refreshRate: enabled && hasClaims ? refreshRate : 0,
  });
  // Each Pod resolves on its own so one failed lookup never hides a sibling replica.
  const groups = React.useMemo(
    () =>
      pods.map((pod) => {
        const group = resolveWorkloadClaims({ pod }, lookups, { containerNames });
        const description = podDescriptions?.[pod.metadata.name];
        return description && group.pod ? { ...group, pod: { ...group.pod, description } } : group;
      }),
    [pods, lookups, containerNames, podDescriptions],
  );

  return { hasClaims, podsLoaded, podsError, groups, containerNames };
};
