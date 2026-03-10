import { RayClusterModel } from '@odh-dashboard/internal/api/models/kubeflow';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import { RayClusterKind } from '../k8sTypes';

export const useRayClusters = (namespace: string | null): CustomWatchK8sResult<RayClusterKind[]> =>
  useK8sWatchResourceList(
    namespace !== null
      ? {
          isList: true,
          groupVersionKind: groupVersionKind(RayClusterModel),
          namespace,
        }
      : null,
    RayClusterModel,
  );
