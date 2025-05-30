import { PodModel } from '@odh-dashboard/internal/api/models/index';
import {
  InferenceServiceKind,
  K8sAPIOptions,
  PodKind,
  ProjectKind,
  ServingRuntimeKind,
} from '@odh-dashboard/internal/k8sTypes';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import {
  InferenceServiceModel,
  ServingRuntimeModel,
} from '@odh-dashboard/internal/api/models/kserve';
import { CustomWatchK8sResult } from '@odh-dashboard/internal/types';

export const useWatchInferenceServices = (
  project: ProjectKind,
  opts?: K8sAPIOptions,
): CustomWatchK8sResult<InferenceServiceKind[]> =>
  useK8sWatchResourceList<InferenceServiceKind[]>(
    {
      isList: true,
      groupVersionKind: groupVersionKind(InferenceServiceModel),
      namespace: project.metadata.name,
    },
    InferenceServiceModel,
    opts,
  );

export const useWatchServingRuntimes = (
  project: ProjectKind,
  opts?: K8sAPIOptions,
): CustomWatchK8sResult<ServingRuntimeKind[]> =>
  useK8sWatchResourceList<ServingRuntimeKind[]>(
    {
      isList: true,
      groupVersionKind: groupVersionKind(ServingRuntimeModel),
      namespace: project.metadata.name,
    },
    ServingRuntimeModel,
    opts,
  );

export const useWatchDeploymentPods = (
  project: ProjectKind,
  opts?: K8sAPIOptions,
): CustomWatchK8sResult<PodKind[]> =>
  useK8sWatchResourceList<PodKind[]>(
    {
      isList: true,
      groupVersionKind: groupVersionKind(PodModel),
      namespace: project.metadata.name,
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
