import React from 'react';
import type { K8sAPIOptions, ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import { getLLMdDeploymentEndpoints } from './endpoints';
import { getLlmdDeploymentStatus as getLLMdDeploymentStatus } from './status';
import {
  LLMInferenceServiceModel,
  type LLMdDeployment,
  type LLMInferenceServiceKind,
} from '../types';
import { LLMD_SERVING_ID } from '../../extensions/extensions';

export const useWatchDeployments = (
  project?: ProjectKind,
  labelSelectors?: { [key: string]: string },
  filterFn?: (llmInferenceService: LLMInferenceServiceKind) => boolean,
  opts?: K8sAPIOptions,
): [LLMdDeployment[] | undefined, boolean, Error | undefined] => {
  const [llmInferenceServices, llmInferenceServiceLoaded, llmInferenceServiceError] =
    useK8sWatchResourceList<LLMInferenceServiceKind[]>(
      {
        isList: true,
        groupVersionKind: groupVersionKind(LLMInferenceServiceModel),
        namespace: project?.metadata.name,
        ...(labelSelectors && { selector: labelSelectors }),
      },
      LLMInferenceServiceModel,
      opts,
    );

  const filteredLlmInferenceServices = React.useMemo(() => {
    if (!filterFn) {
      return llmInferenceServices;
    }
    return llmInferenceServices.filter(filterFn);
  }, [llmInferenceServices, filterFn]);

  const deployments: LLMdDeployment[] = React.useMemo(
    () =>
      filteredLlmInferenceServices.map((llmInferenceService) => ({
        modelServingPlatformId: LLMD_SERVING_ID,
        model: llmInferenceService,
        apiProtocol: 'REST', // vLLM uses REST so I assume it's the same for LLMd
        endpoints: getLLMdDeploymentEndpoints(llmInferenceService),
        status: getLLMdDeploymentStatus(llmInferenceService),
      })),
    [filteredLlmInferenceServices],
  );

  return [deployments, llmInferenceServiceLoaded, llmInferenceServiceError];
};
