import * as React from 'react';
import type { Connection, PersistentVolumeClaimKind, ProjectKind } from '@odh-dashboard/k8s-core';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import type {
  ConnectedResourceLabel,
  ConnectionsConnectedResources,
} from '@odh-dashboard/plugin-core/extension-points';
import {
  modelServingResourceUsesResource,
  type ConnectedResourceKind,
} from '@odh-dashboard/model-serving/shared/utils/connectedResources';
import { LLMInferenceServiceKind } from '../types';
import { useWatchLLMInferenceService } from '../api/LLMInferenceService';

export type LLMdConnectionsResourcesData = {
  llmInferenceServices: LLMInferenceServiceKind[];
};

/** Lists the project's LLMd LLMInferenceServices for connection matching. */
export const useConnectedResources = (
  project: ProjectKind,
): ConnectionsConnectedResources<LLMdConnectionsResourcesData> => {
  const [llmInferenceServices, llmInferenceServicesLoaded, llmInferenceServicesError] =
    useWatchLLMInferenceService(project.metadata.name);

  return React.useMemo(
    () => ({
      loaded: llmInferenceServicesLoaded || !!llmInferenceServicesError,
      data: { llmInferenceServices },
    }),
    [llmInferenceServices, llmInferenceServicesLoaded, llmInferenceServicesError],
  );
};

const llmInferenceServiceUsesResource = (
  llmInferenceService: LLMInferenceServiceKind,
  resourceName: string,
  resourceKind: ConnectedResourceKind,
): boolean =>
  modelServingResourceUsesResource(
    {
      annotations: llmInferenceService.metadata.annotations,
      imagePullSecrets: llmInferenceService.spec.template?.imagePullSecrets,
      storageUri: llmInferenceService.spec.model.uri,
    },
    resourceName,
    resourceKind,
  );
/**
 * Returns a label for each LLMd LLMInferenceService that references the given connection or PVC.
 */
export const getConnectedResourceLabels = (
  resource: Connection | PersistentVolumeClaimKind,
  { llmInferenceServices }: LLMdConnectionsResourcesData,
): ConnectedResourceLabel[] => {
  const resourceName = resource.metadata.name;
  if (!resourceName) {
    return [];
  }
  const resourceKind = resource.kind === 'PersistentVolumeClaim' ? 'pvc' : 'connection';

  return llmInferenceServices
    .filter((llmInferenceService) =>
      llmInferenceServiceUsesResource(llmInferenceService, resourceName, resourceKind),
    )
    .map((llmInferenceService) => ({
      key: `llmd:${llmInferenceService.metadata.name}`,
      title: getDisplayNameFromK8sResource(llmInferenceService),
      kind: 'connected-models',
    }));
};
