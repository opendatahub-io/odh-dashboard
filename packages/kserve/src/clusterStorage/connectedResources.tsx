import * as React from 'react';
import type { PersistentVolumeClaimKind, ProjectKind } from '@odh-dashboard/k8s-core';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import type { InferenceServiceKind, ServingRuntimeKind } from '@odh-dashboard/model-serving/shared';
import type {
  ClusterStorageConnectedResources,
  ConnectedResourceLabel,
} from '@odh-dashboard/plugin-core/extension-points';
import { useWatchInferenceServices, useWatchServingRuntimes } from '../api/watch';

export type KServeConnectedResourcesData = {
  inferenceServices: InferenceServiceKind[];
  servingRuntimes: ServingRuntimeKind[];
};

/**
 * Lists the project's inference services and their serving runtimes.
 */
export const useConnectedKServeResources = (
  project: ProjectKind,
): ClusterStorageConnectedResources<KServeConnectedResourcesData> => {
  const [inferenceServices, inferenceServicesLoaded] = useWatchInferenceServices(project);
  const [servingRuntimes, servingRuntimesLoaded] = useWatchServingRuntimes(project);

  return React.useMemo(
    () => ({
      // Labels are derived by filtering inference services, so with zero of them there is nothing to
      // show regardless of serving runtimes — no need to wait on that second list.
      loaded: inferenceServicesLoaded && (inferenceServices.length === 0 || servingRuntimesLoaded),
      data: { inferenceServices, servingRuntimes },
    }),
    [inferenceServices, inferenceServicesLoaded, servingRuntimes, servingRuntimesLoaded],
  );
};

const servingRuntimeUsesPVC = (servingRuntime: ServingRuntimeKind, pvcName: string): boolean =>
  servingRuntime.spec.volumes?.some(
    (volume) => volume.persistentVolumeClaim?.claimName === pvcName,
  ) ?? false;

/**
 * Returns a label descriptor for each inference service whose serving runtime mounts `pvc` as a
 * volume (matching `claimName`).
 */
export const getConnectedKServeResourceLabels = (
  pvc: PersistentVolumeClaimKind,
  { inferenceServices, servingRuntimes }: KServeConnectedResourcesData,
): ConnectedResourceLabel[] =>
  inferenceServices
    .filter((inferenceService) => {
      const servingRuntime = servingRuntimes.find(
        (runtime) => runtime.metadata.name === inferenceService.spec.predictor.model?.runtime,
      );
      return servingRuntime ? servingRuntimeUsesPVC(servingRuntime, pvc.metadata.name) : false;
    })
    .map((inferenceService) => ({
      key: inferenceService.metadata.name,
      title: getDisplayNameFromK8sResource(inferenceService),
      kind: 'connected-models',
    }));
