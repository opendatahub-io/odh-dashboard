import { PodModel } from '@odh-dashboard/internal/api/models/index';
import {
  InferenceServiceKind,
  K8sAPIOptions,
  PodKind,
  ProjectKind,
} from '@odh-dashboard/internal/k8sTypes';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import { InferenceServiceModel } from '@odh-dashboard/internal/api/models/kserve';
import type { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import { NIMServiceModel, type NIMServiceKind } from '../types';

export const useWatchNIMServices = (
  project?: ProjectKind,
  labelSelectors?: Record<string, string>,
  opts?: K8sAPIOptions,
): CustomWatchK8sResult<NIMServiceKind[]> =>
  useK8sWatchResourceList<NIMServiceKind[]>(
    {
      isList: true,
      groupVersionKind: groupVersionKind(NIMServiceModel),
      namespace: project?.metadata.name,
      ...(labelSelectors && { selector: labelSelectors }),
    },
    NIMServiceModel,
    opts,
  );

export const useWatchInferenceServices = (
  project?: ProjectKind,
  opts?: K8sAPIOptions,
): CustomWatchK8sResult<InferenceServiceKind[]> =>
  useK8sWatchResourceList<InferenceServiceKind[]>(
    {
      isList: true,
      groupVersionKind: groupVersionKind(InferenceServiceModel),
      namespace: project?.metadata.name,
    },
    InferenceServiceModel,
    opts,
  );

export const useWatchNIMDeploymentPods = (
  project?: ProjectKind,
  opts?: K8sAPIOptions,
): CustomWatchK8sResult<PodKind[]> =>
  useK8sWatchResourceList<PodKind[]>(
    {
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
    },
    PodModel,
    opts,
  );
