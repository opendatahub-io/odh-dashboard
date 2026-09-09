import * as React from 'react';
import type { PersistentVolumeClaimKind, ProjectKind } from '@odh-dashboard/k8s-core';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import type { InferenceServiceKind, ServingRuntimeKind } from '@odh-dashboard/model-serving/shared';
import type {
  ClusterStorageConnectedResources,
  ConnectedResourceLabel,
} from '@odh-dashboard/plugin-core/extension-points';
import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { NotReadyError } from '@odh-dashboard/ui-core/hooks/useFetch';
import {
  InferenceServiceModel,
  ServingRuntimeModel,
} from '@odh-dashboard/internal/api/models/kserve';
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
  const [inferenceServices, inferenceServicesLoaded, inferenceServicesError] =
    useWatchInferenceServices(project);
  const [servingRuntimes, servingRuntimesLoaded, servingRuntimesError] =
    useWatchServingRuntimes(project);

  const inferenceServicesFinished = inferenceServicesLoaded || !!inferenceServicesError;
  const servingRuntimesFinished = servingRuntimesLoaded || !!servingRuntimesError;

  return React.useMemo(
    () => ({
      // Labels are derived by filtering inference services, so with zero of them there is nothing to
      // show regardless of serving runtimes — no need to wait on that second list.
      loaded:
        inferenceServicesFinished && (inferenceServices.length === 0 || servingRuntimesFinished),
      data: { inferenceServices, servingRuntimes },
    }),
    [inferenceServices, inferenceServicesFinished, servingRuntimes, servingRuntimesFinished],
  );
};

const servingRuntimeUsesPVC = (servingRuntime: ServingRuntimeKind, pvcName: string): boolean =>
  Boolean(pvcName) &&
  (servingRuntime.spec.volumes?.some(
    (volume) => volume.persistentVolumeClaim?.claimName === pvcName,
  ) ??
    false);

export type KServePVCDependentDeployment = {
  name: string;
  displayName: string;
};

/**
 * Finds InferenceServices whose selected ServingRuntime mounts the requested PVC.
 * The selected InferenceService can be excluded by resource name when it is being deleted.
 */
export const getKServePVCDependentDeploymentsFromResources = (
  inferenceServices: InferenceServiceKind[],
  servingRuntimes: ServingRuntimeKind[],
  pvcName: string,
  excludeInferenceServiceName?: string,
): KServePVCDependentDeployment[] => {
  if (!pvcName) {
    return [];
  }

  const runtimeNames = new Set(
    servingRuntimes
      .filter((runtime) => servingRuntimeUsesPVC(runtime, pvcName))
      .map((runtime) => runtime.metadata.name)
      .filter((name): name is string => typeof name === 'string' && name.length > 0),
  );

  return inferenceServices.flatMap((inferenceService) => {
    const { name } = inferenceService.metadata;
    const runtimeName = inferenceService.spec.predictor.model?.runtime;
    if (
      typeof name !== 'string' ||
      !name ||
      name === excludeInferenceServiceName ||
      typeof runtimeName !== 'string' ||
      !runtimeNames.has(runtimeName)
    ) {
      return [];
    }

    return [{ name, displayName: getDisplayNameFromK8sResource(inferenceService) }];
  });
};

/** Lists all model deployments in a namespace that use a PVC. */
export const getKServePVCDependentDeployments = async (
  namespace: string,
  pvcName: string,
  excludeInferenceServiceName?: string,
): Promise<KServePVCDependentDeployment[]> => {
  if (!namespace) {
    throw new NotReadyError('Namespace required to find PVC dependents');
  }
  if (!pvcName) {
    throw new NotReadyError('PVC name required to find PVC dependents');
  }

  const [inferenceServices, servingRuntimes] = await Promise.all([
    k8sListResourceItems<InferenceServiceKind>({
      model: InferenceServiceModel,
      queryOptions: { ns: namespace },
    }),
    k8sListResourceItems<ServingRuntimeKind>({
      model: ServingRuntimeModel,
      queryOptions: { ns: namespace },
    }),
  ]);

  return getKServePVCDependentDeploymentsFromResources(
    inferenceServices,
    servingRuntimes,
    pvcName,
    excludeInferenceServiceName,
  );
};

/**
 * Returns a label descriptor for each inference service whose serving runtime mounts `pvc` as a
 * volume (matching `claimName`).
 */
export const getConnectedKServeResourceLabels = (
  pvc: PersistentVolumeClaimKind,
  { inferenceServices, servingRuntimes }: KServeConnectedResourcesData,
): ConnectedResourceLabel[] =>
  getKServePVCDependentDeploymentsFromResources(
    inferenceServices,
    servingRuntimes,
    pvc.metadata.name,
  ).map(({ name, displayName }) => ({
    key: name,
    title: displayName,
    kind: 'connected-models',
  }));
