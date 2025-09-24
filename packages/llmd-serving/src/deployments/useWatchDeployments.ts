import React from 'react';
import type { K8sAPIOptions, ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import {
  LLMInferenceServiceModel,
  type LLMdDeployment,
  type LLMInferenceServiceKind,
} from '../types';
import { LLMD_SERVING_ID } from '../../extensions';

export const useWatchDeployments = (
  project?: ProjectKind,
  labelSelectors?: { [key: string]: string },
  mrName?: string,
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

  const deployments: LLMdDeployment[] = React.useMemo(
    () =>
      llmInferenceServices.map((llmInferenceService) => ({
        modelServingPlatformId: LLMD_SERVING_ID,
        model: llmInferenceService,
        apiProtocol: 'REST',
      })),
    [llmInferenceServices],
  );

  return [deployments, llmInferenceServiceLoaded, llmInferenceServiceError];
};
