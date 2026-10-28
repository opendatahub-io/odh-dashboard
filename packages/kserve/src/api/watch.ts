import { PodModel } from '@odh-dashboard/k8s-core/api/models';
import type { K8sAPIOptions, PodKind, ProjectKind } from '@odh-dashboard/k8s-core';
import type { InferenceServiceKind, ServingRuntimeKind } from '@odh-dashboard/model-serving/shared';
import useK8sWatchResourceList from '@odh-dashboard/ui-core/hooks/useK8sWatchResourceList';
import { groupVersionKind } from '@odh-dashboard/k8s-core/api/k8sUtils';
import {
  InferenceServiceModel,
  ServingRuntimeModel,
} from '@odh-dashboard/internal/api/models/kserve';
import type { CustomWatchK8sResult } from '@odh-dashboard/internal/types';

const EMPTY_SERVING_RUNTIMES_RESULT: CustomWatchK8sResult<ServingRuntimeKind[]> = [
  [],
  true,
  undefined,
];
const EMPTY_DEPLOYMENT_PODS_RESULT: CustomWatchK8sResult<PodKind[]> = [[], true, undefined];

export const useWatchInferenceServices = (
  project?: ProjectKind,
  labelSelectors?: { [key: string]: string },
  opts?: K8sAPIOptions,
): CustomWatchK8sResult<InferenceServiceKind[]> =>
  useK8sWatchResourceList<InferenceServiceKind[]>(
    {
      isList: true,
      groupVersionKind: groupVersionKind(InferenceServiceModel),
      namespace: project?.metadata.name,
      ...(labelSelectors && { selector: labelSelectors }),
    },
    InferenceServiceModel,
    opts,
  );

export const useWatchServingRuntimes = (
  project?: ProjectKind,
  opts?: K8sAPIOptions,
  enabled = true,
): CustomWatchK8sResult<ServingRuntimeKind[]> => {
  const result = useK8sWatchResourceList<ServingRuntimeKind[]>(
    enabled
      ? {
          isList: true,
          groupVersionKind: groupVersionKind(ServingRuntimeModel),
          namespace: project?.metadata.name,
        }
      : null,
    ServingRuntimeModel,
    opts,
  );

  return enabled ? result : EMPTY_SERVING_RUNTIMES_RESULT;
};

export const useWatchDeploymentPods = (
  project?: ProjectKind,
  opts?: K8sAPIOptions,
  enabled = true,
): CustomWatchK8sResult<PodKind[]> => {
  const result = useK8sWatchResourceList<PodKind[]>(
    enabled
      ? {
          isList: true,
          groupVersionKind: groupVersionKind(PodModel),
          namespace: project?.metadata.name,
          selector: {
            matchExpressions: [
              {
                key: 'serving.kserve.io/inferenceservice',
                operator: 'Exists',
              },
            ],
          },
        }
      : null,
    PodModel,
    opts,
  );

  return enabled ? result : EMPTY_DEPLOYMENT_PODS_RESULT;
};
