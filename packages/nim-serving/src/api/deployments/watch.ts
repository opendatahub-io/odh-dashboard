import { PodModel } from '@odh-dashboard/k8s-core/api/models';
import type { K8sAPIOptions, PodKind, ProjectKind } from '@odh-dashboard/k8s-core';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
import useK8sWatchResourceList from '@odh-dashboard/ui-core/hooks/useK8sWatchResourceList';
import { groupVersionKind } from '@odh-dashboard/k8s-core/api/k8sUtils';
import { InferenceServiceModel } from '@odh-dashboard/internal/api/models/kserve';
import type { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import { NIM_OPERATOR_MANAGED_BY } from '../../constants';

const EMPTY_INFERENCE_SERVICES_RESULT: CustomWatchK8sResult<InferenceServiceKind[]> = [
  [],
  true,
  undefined,
];
const EMPTY_NIM_DEPLOYMENT_PODS_RESULT: CustomWatchK8sResult<PodKind[]> = [[], true, undefined];

export const useWatchInferenceServices = (
  project?: ProjectKind,
  opts?: K8sAPIOptions,
  enabled = true,
): CustomWatchK8sResult<InferenceServiceKind[]> => {
  const result = useK8sWatchResourceList<InferenceServiceKind[]>(
    enabled
      ? {
          isList: true,
          groupVersionKind: groupVersionKind(InferenceServiceModel),
          namespace: project?.metadata.name,
        }
      : null,
    InferenceServiceModel,
    opts,
  );

  return enabled ? result : EMPTY_INFERENCE_SERVICES_RESULT;
};

export const useWatchNIMDeploymentPods = (
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
            'app.kubernetes.io/managed-by': NIM_OPERATOR_MANAGED_BY,
          },
        }
      : null,
    PodModel,
    opts,
  );

  return enabled ? result : EMPTY_NIM_DEPLOYMENT_PODS_RESULT;
};
