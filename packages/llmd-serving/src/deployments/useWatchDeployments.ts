import React from 'react';
import type { K8sAPIOptions, PodKind, ProjectKind } from '@odh-dashboard/k8s-core';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { useKueueStatusWithQueuePositions } from '@odh-dashboard/internal/pages/modelServing/useKueueStatusWithQueuePositions';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { buildModelDeploymentKey } from '@odh-dashboard/internal/api/k8s/workloads';
import {
  LLMD_MAIN_CONTAINER_NAME,
  LLMD_WORKLOAD_POD_COMPONENT,
  LLMD_WORKLOAD_POD_COMPONENTS,
  getLLMdPodDescriptions,
} from './constants';
import { getLLMdDeploymentEndpoints } from './endpoints';
import { getLLMdDeploymentStatus, useLLMInferenceServicePods } from './status';
import { useWatchLLMInferenceService } from '../api/LLMInferenceService';
import { useWatchLLMInferenceServiceConfigs } from '../api/LLMInferenceServiceConfigs';
import { type LLMdDeployment, type LLMInferenceServiceKind } from '../types';
import { LLMD_SERVING_ID } from '../../extensions/extensions';

// The model server container of every llm-d workload Pod.
export const LLMD_MODEL_CONTAINER_NAMES = [LLMD_MAIN_CONTAINER_NAME];

const belongsTo = (pod: PodKind, llmInferenceServiceName: string): boolean =>
  pod.metadata.labels?.['app.kubernetes.io/name'] === llmInferenceServiceName;

/** Every workload Pod of one LLMInferenceService: decode, prefill, leader, and worker shapes. */
export const selectLLMInferenceServicePods = (
  pods: PodKind[],
  llmInferenceServiceName: string,
): PodKind[] =>
  pods.filter(
    (pod) =>
      belongsTo(pod, llmInferenceServiceName) &&
      LLMD_WORKLOAD_POD_COMPONENTS.includes(
        pod.metadata.labels?.['app.kubernetes.io/component'] ?? '',
      ),
  );

/** The single-node Pods the status has always been derived from. */
export const selectLLMInferenceServiceStatusPods = (
  pods: PodKind[],
  llmInferenceServiceName: string,
): PodKind[] =>
  pods.filter(
    (pod) =>
      belongsTo(pod, llmInferenceServiceName) &&
      pod.metadata.labels?.['app.kubernetes.io/component'] === LLMD_WORKLOAD_POD_COMPONENT,
  );

export const useWatchDeployments = (
  project: ProjectKind,
  labelSelectors?: { [key: string]: string },
  filterFn?: (llmInferenceService: LLMInferenceServiceKind) => boolean,
  opts?: K8sAPIOptions,
): [LLMdDeployment[] | undefined, boolean, Error[] | undefined] => {
  const [llmInferenceServices, llmInferenceServiceLoaded, llmInferenceServiceError] =
    useWatchLLMInferenceService(project.metadata.name, opts, labelSelectors);

  const filteredLLMInferenceServices = React.useMemo(
    () => (filterFn ? llmInferenceServices.filter(filterFn) : llmInferenceServices),
    [llmInferenceServices, filterFn],
  );

  const [
    llmInferenceServiceConfigs,
    llmInferenceServiceConfigsLoaded,
    llmInferenceServiceConfigsError,
  ] = useWatchLLMInferenceServiceConfigs(project.metadata.name, undefined, opts);

  const [deploymentPods, deploymentPodsLoaded, deploymentPodsError] = useLLMInferenceServicePods(
    project.metadata.name,
    opts,
  );

  const {
    kueueStatusByDeploymentKey,
    isLoading: kueueLoading,
    error: kueueError,
  } = useKueueStatusWithQueuePositions([], project, filteredLLMInferenceServices);

  const deployments = React.useMemo(() => {
    return filteredLLMInferenceServices.map((llmInferenceService) => {
      const { name } = llmInferenceService.metadata;
      const pods = selectLLMInferenceServicePods(deploymentPods, name);
      const statusPods = selectLLMInferenceServiceStatusPods(deploymentPods, name);

      const matchingBaseRefConfig = llmInferenceService.spec.baseRefs?.find(
        (baseRef) => baseRef.name === name,
      );

      const kueueStatus =
        kueueStatusByDeploymentKey[buildModelDeploymentKey('LLMInferenceService', name)] ?? null;

      return {
        modelServingPlatformId: LLMD_SERVING_ID,
        model: llmInferenceService,
        server: matchingBaseRefConfig
          ? llmInferenceServiceConfigs.find(
              (config) => config.metadata.name === matchingBaseRefConfig.name,
            )
          : undefined,
        apiProtocol: 'REST', // vLLM uses REST so I assume it's the same for LLMd
        endpoints: getLLMdDeploymentEndpoints(llmInferenceService),
        status: getLLMdDeploymentStatus(llmInferenceService, statusPods, kueueStatus),
        // Claims see every workload Pod, each as its own group, with its llm-d role when labelled.
        pods: {
          data: pods,
          loaded: deploymentPodsLoaded,
          error: deploymentPodsError,
          containerNames: LLMD_MODEL_CONTAINER_NAMES,
          podDescriptions: getLLMdPodDescriptions(pods),
        },
      };
    });
  }, [
    filteredLLMInferenceServices,
    deploymentPods,
    deploymentPodsLoaded,
    deploymentPodsError,
    llmInferenceServiceConfigs,
    kueueStatusByDeploymentKey,
  ]);

  const effectivelyLoaded = Boolean(
    (llmInferenceServiceLoaded || llmInferenceServiceError) &&
      (llmInferenceServiceConfigsLoaded || llmInferenceServiceConfigsError) &&
      (deploymentPodsLoaded || deploymentPodsError) &&
      (!kueueLoading || kueueError),
  );

  const errors = React.useMemo(() => {
    return [
      llmInferenceServiceError,
      llmInferenceServiceConfigsError,
      deploymentPodsError,
      kueueError ? new Error(kueueError) : undefined,
    ].filter((error): error is Error => Boolean(error));
  }, [llmInferenceServiceError, llmInferenceServiceConfigsError, deploymentPodsError, kueueError]);

  return React.useMemo(
    () => [deployments, effectivelyLoaded, errors],
    [deployments, effectivelyLoaded, errors],
  );
};
