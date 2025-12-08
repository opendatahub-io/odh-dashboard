import React from 'react';
import type { K8sAPIOptions, ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import { getLLMdDeploymentEndpoints } from './endpoints';
import {
  calculateGracePeriod,
  getLLMdDeploymentStatus,
  useLLMInferenceServicePods,
} from './status';
import {
  LLMInferenceServiceModel,
  type LLMdDeployment,
  type LLMInferenceServiceKind,
} from '../types';
import { LLMD_SERVING_ID } from '../../extensions/extensions';

export const useWatchDeployments = (
  project: ProjectKind,
  labelSelectors?: { [key: string]: string },
  filterFn?: (llmInferenceService: LLMInferenceServiceKind) => boolean,
  opts?: K8sAPIOptions,
): [LLMdDeployment[] | undefined, boolean, Error | undefined] => {
  const [llmInferenceServices, llmInferenceServiceLoaded, llmInferenceServiceError] =
    useK8sWatchResourceList<LLMInferenceServiceKind[]>(
      {
        isList: true,
        groupVersionKind: groupVersionKind(LLMInferenceServiceModel),
        namespace: project.metadata.name,
        ...(labelSelectors && { selector: labelSelectors }),
      },
      LLMInferenceServiceModel,
      opts,
    );

  const filteredLLMInferenceServices = React.useMemo(
    () => (filterFn ? llmInferenceServices.filter(filterFn) : llmInferenceServices),
    [llmInferenceServices, filterFn],
  );

  const [deploymentPods, deploymentPodsLoaded] = useLLMInferenceServicePods(
    project.metadata.name,
    opts,
  );

  const loaded = llmInferenceServiceLoaded && deploymentPodsLoaded;

  const effectivelyLoaded =
    loaded ||
    (llmInferenceServiceError ? llmInferenceServiceError.message.includes('forbidden') : false);

  const deployments = React.useMemo(() => {
    return filteredLLMInferenceServices.map((llmInferenceService) => {
      const pods = deploymentPods.filter(
        (pod) =>
          pod.metadata.labels?.['app.kubernetes.io/name'] === llmInferenceService.metadata.name &&
          pod.metadata.labels['app.kubernetes.io/component'] === 'llminferenceservice-workload',
      );
      const lastActivity = new Date(
        llmInferenceService.status?.conditions?.find((c) => c.type === 'Ready')
          ?.lastTransitionTime ?? '',
      );

      const gracePeriod = calculateGracePeriod(lastActivity);
      return {
        modelServingPlatformId: LLMD_SERVING_ID,
        model: llmInferenceService,
        apiProtocol: 'REST', // vLLM uses REST so I assume it's the same for LLMd
        endpoints: getLLMdDeploymentEndpoints(llmInferenceService),
        status: getLLMdDeploymentStatus(llmInferenceService, pods, gracePeriod),
      };
    });
  }, [filteredLLMInferenceServices, deploymentPods]);

  return [deployments, effectivelyLoaded, llmInferenceServiceError];
};
