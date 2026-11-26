import React from 'react';
import type { K8sAPIOptions, ProjectKind } from '@odh-dashboard/k8s-core';
import type { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { PodModel } from '@odh-dashboard/k8s-core/api/models';
import { useAccessReviewResult, useHostApiCore } from '@odh-dashboard/plugin-core/host-api';
import { useKueueStatusWithQueuePositions } from '@odh-dashboard/model-serving/shared/kueue/useKueueStatusWithQueuePositions';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { buildModelDeploymentKey } from '@odh-dashboard/model-serving/shared/utils/deploymentKey';
import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import { getLLMdDeploymentEndpoints } from './endpoints';
import { getLLMdDeploymentStatus, useLLMInferenceServicePods } from './status';
import { useWatchLLMInferenceService } from '../api/LLMInferenceService';
import { useWatchLLMInferenceServiceConfigs } from '../api/LLMInferenceServiceConfigs';
import {
  type LLMdDeployment,
  type LLMInferenceServiceKind,
  LLMInferenceServiceConfigModel,
} from '../types';

// Related resources enrich a deployment. A user may be able to read the model without them.
const useRelatedWatch = (model: K8sModelCommon, namespace: string, needed: boolean) => {
  const { deploymentApi } = useHostApiCore();
  const resource = model.plural;
  const verbs = deploymentApi?.resources[resource];
  const served =
    model.apiGroup !== deploymentApi?.group ||
    (!!verbs?.includes('list') && verbs.includes('watch'));
  const review = !!deploymentApi && needed && served;
  const attrs = { group: model.apiGroup, resource, namespace };
  const list = useAccessReviewResult({ ...attrs, verb: 'list' }, review);
  const watch = useAccessReviewResult({ ...attrs, verb: 'watch' }, review);
  const loaded = !review || (list.loaded && watch.loaded);
  const enabled = needed && (!deploymentApi || (served && list.allowed && watch.allowed));
  const reason =
    needed && loaded && !enabled
      ? list.error?.message ??
        watch.error?.message ??
        `Cannot watch ${resource} in project ${namespace}.`
      : undefined;
  const error = React.useMemo(() => (reason ? new Error(reason) : undefined), [reason]);
  return { enabled, loaded, error };
};

export const useWatchDeployments = (
  project: ProjectKind,
  labelSelectors?: { [key: string]: string },
  filterFn?: (llmInferenceService: LLMInferenceServiceKind) => boolean,
  opts?: K8sAPIOptions,
): [LLMdDeployment[] | undefined, boolean, Error[] | undefined] => {
  const { deploymentApi } = useHostApiCore();
  const [llmInferenceServices, llmInferenceServiceLoaded, llmInferenceServiceError] =
    useWatchLLMInferenceService(project.metadata.name, opts, labelSelectors);

  const filteredLLMInferenceServices = React.useMemo(
    () => (filterFn ? llmInferenceServices.filter(filterFn) : llmInferenceServices),
    [llmInferenceServices, filterFn],
  );

  const hasLLMInferenceServices = filteredLLMInferenceServices.length > 0;
  const configs = useRelatedWatch(
    LLMInferenceServiceConfigModel,
    project.metadata.name,
    hasLLMInferenceServices,
  );
  const pods = useRelatedWatch(PodModel, project.metadata.name, hasLLMInferenceServices);

  const [
    llmInferenceServiceConfigs,
    llmInferenceServiceConfigsLoaded,
    llmInferenceServiceConfigsError,
  ] = useWatchLLMInferenceServiceConfigs(project.metadata.name, undefined, opts, configs.enabled);

  const [deploymentPods, podWatchLoaded, podWatchError] = useLLMInferenceServicePods(
    project.metadata.name,
    opts,
    pods.enabled,
  );
  const deploymentPodsLoaded = pods.loaded && podWatchLoaded && !pods.error;
  const deploymentPodsError = pods.error ?? podWatchError;

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

  const primaryReady = Boolean(llmInferenceServiceLoaded || llmInferenceServiceError);
  const relatedResourcesReady = Boolean(
    (llmInferenceServiceConfigsLoaded || llmInferenceServiceConfigsError) &&
      (podWatchLoaded || podWatchError) &&
      !kueueLoading,
  );
  const effectivelyLoaded = primaryReady && (deploymentApi !== undefined || relatedResourcesReady);

  const errors = React.useMemo(() => {
    const watchErrors = deploymentApi
      ? [llmInferenceServiceError]
      : [llmInferenceServiceError, llmInferenceServiceConfigsError, podWatchError];
    return watchErrors.filter((error): error is Error => Boolean(error));
  }, [deploymentApi, llmInferenceServiceError, llmInferenceServiceConfigsError, podWatchError]);

  return React.useMemo(
    () => [deployments, effectivelyLoaded, errors],
    [deployments, effectivelyLoaded, errors],
  );
};
