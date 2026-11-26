import * as React from 'react';
import type { Connection, PersistentVolumeClaimKind, ProjectKind } from '@odh-dashboard/k8s-core';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
import {
  modelServingResourceUsesResource,
  type ConnectedResourceKind,
} from '@odh-dashboard/model-serving/shared/utils/connectedResources';
import type {
  ConnectedResourceLabel,
  ConnectionsConnectedResources,
} from '@odh-dashboard/plugin-core/extension-points';
import { useWatchInferenceServices } from '../api/watch';

export type KServeConnectionsResourcesData = {
  inferenceServices: InferenceServiceKind[];
};

/** Lists the project's KServe InferenceServices for connection matching. */
export const useConnectedKServeResources = (
  project: ProjectKind,
): ConnectionsConnectedResources<KServeConnectionsResourcesData> => {
  const [inferenceServices, inferenceServicesLoaded, inferenceServicesError] =
    useWatchInferenceServices(project);

  return React.useMemo(
    () => ({
      loaded: inferenceServicesLoaded || !!inferenceServicesError,
      data: { inferenceServices },
    }),
    [inferenceServices, inferenceServicesLoaded, inferenceServicesError],
  );
};

const inferenceServiceUsesResource = (
  inferenceService: InferenceServiceKind,
  resourceName: string,
  resourceKind: ConnectedResourceKind,
): boolean =>
  modelServingResourceUsesResource(
    {
      annotations: inferenceService.metadata.annotations,
      storageKey: inferenceService.spec.predictor.model?.storage?.key,
      imagePullSecrets: inferenceService.spec.predictor.imagePullSecrets,
      storageUri: inferenceService.spec.predictor.model?.storageUri,
    },
    resourceName,
    resourceKind,
  );

/**
 * Returns a label for each KServe InferenceService that references the given connection or PVC.
 */
export const getConnectedKServeResourceLabels = (
  resource: Connection | PersistentVolumeClaimKind,
  { inferenceServices }: KServeConnectionsResourcesData,
): ConnectedResourceLabel[] => {
  const resourceName = resource.metadata.name;
  if (!resourceName) {
    return [];
  }

  const resourceKind = resource.spec?.accessModes ? 'pvc' : 'connection';

  return inferenceServices
    .filter((inferenceService) =>
      inferenceServiceUsesResource(inferenceService, resourceName, resourceKind),
    )
    .map((inferenceService) => ({
      key: `kserve:${inferenceService.metadata.name}`,
      title: getDisplayNameFromK8sResource(inferenceService),
      kind: 'connected-models',
    }));
};
