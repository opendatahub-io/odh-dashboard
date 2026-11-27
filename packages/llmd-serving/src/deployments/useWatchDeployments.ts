import React from 'react';
import type { K8sAPIOptions, ProjectKind } from '@odh-dashboard/k8s-core';
import { useKueueStatusWithQueuePositions } from '@odh-dashboard/model-serving/shared/kueue/useKueueStatusWithQueuePositions';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { buildModelDeploymentKey } from '@odh-dashboard/model-serving/shared/utils/deploymentKey';
import { getGenericErrorCode } from '@odh-dashboard/k8s-core/api/errorUtils';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import { getLLMdDeploymentEndpoints } from './endpoints';
import { getLLMdDeploymentStatus, useLLMInferenceServicePods } from './status';
import { useWatchLLMInferenceService } from '../api/LLMInferenceService';
import { useWatchLLMInferenceServiceConfigs } from '../api/LLMInferenceServiceConfigs';
import { type LLMdDeployment, type LLMInferenceServiceKind } from '../types';

const isForbidden = (error: Error | undefined): boolean => getGenericErrorCode(error) === 403;

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

  const hasLLMInferenceServices = filteredLLMInferenceServices.length > 0;

  const [
    llmInferenceServiceConfigs,
    llmInferenceServiceConfigsLoaded,
    llmInferenceServiceConfigsError,
  ] = useWatchLLMInferenceServiceConfigs(
    project.metadata.name,
    undefined,
    opts,
    hasLLMInferenceServices,
  );

  const [deploymentPods, deploymentPodsLoaded, deploymentPodsError] = useLLMInferenceServicePods(
    project.metadata.name,
    opts,
    hasLLMInferenceServices,
  );

  const { kueueStatusByDeploymentKey, isLoading: kueueLoading } = useKueueStatusWithQueuePositions(
    [],
    project,
    filteredLLMInferenceServices,
    opts,
  );

  const deployments = React.useMemo(() => {
    return filteredLLMInferenceServices.map((llmInferenceService) => {
      const modelPods = deploymentPods.filter(
        (pod) =>
          pod.metadata.labels?.['app.kubernetes.io/name'] === llmInferenceService.metadata.name,
      );
      const statusPods = modelPods.filter(
        (pod) =>
          pod.metadata.labels?.['app.kubernetes.io/component'] === 'llminferenceservice-workload',
      );

      const matchingBaseRefConfig = llmInferenceService.spec.baseRefs?.find(
        (baseRef) => baseRef.name === llmInferenceService.metadata.name,
      );

      const kueueStatus =
        kueueStatusByDeploymentKey[
          buildModelDeploymentKey('LLMInferenceService', llmInferenceService.metadata.name)
        ] ?? null;

      return {
        modelServingPlatformId: SupportedArea.LLMD_SERVING,
        model: llmInferenceService,
        server: matchingBaseRefConfig
          ? llmInferenceServiceConfigs.find(
              (config) => config.metadata.name === matchingBaseRefConfig.name,
            )
          : undefined,
        apiProtocol: 'REST', // vLLM uses REST so I assume it's the same for LLMd
        endpoints: getLLMdDeploymentEndpoints(llmInferenceService),
        // getLLMdDeploymentStatus uses the first matching Pod, so pass it only llminferenceservice-workload pods
        // so that leader, worker, prefill, and scheduler Pods are available for diagnostics but not used for status.
        status: getLLMdDeploymentStatus(llmInferenceService, statusPods, kueueStatus),
        podDiscovery: { pods: modelPods, loaded: deploymentPodsLoaded, error: deploymentPodsError },
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
      !kueueLoading,
  );

  // Configs and Pods add details (the server and the status) to a deployment.
  // Where the host has actions for this project (RHAII with discovery), a
  // caller who may not read them still sees their deployments. A denied config
  // read is silenced only while Edit is not offered: editing without the
  // config would drop it, so with Edit offered (e.g. access revoked mid-session)
  // it stays a page error, as it is everywhere else.
  const { getProjectDeploymentActions } = React.useContext(ProjectsContext);
  const projectActions = getProjectDeploymentActions?.(project.metadata.name);
  const hostDecidesAccess = projectActions !== undefined;
  const editOffered = projectActions?.canEdit !== false;
  const errors = React.useMemo(() => {
    const optional = (error: Error | undefined, silence: boolean) =>
      silence && isForbidden(error) ? undefined : error;
    return [
      llmInferenceServiceError,
      optional(llmInferenceServiceConfigsError, hostDecidesAccess && !editOffered),
      optional(deploymentPodsError, hostDecidesAccess),
    ].filter((error): error is Error => Boolean(error));
  }, [
    llmInferenceServiceError,
    llmInferenceServiceConfigsError,
    deploymentPodsError,
    hostDecidesAccess,
    editOffered,
  ]);

  return React.useMemo(
    () => [deployments, effectivelyLoaded, errors],
    [deployments, effectivelyLoaded, errors],
  );
};
