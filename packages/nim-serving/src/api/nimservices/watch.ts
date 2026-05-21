import type { K8sAPIOptions, ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import type { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import { NIMServiceModel, type NIMServiceKind } from './types';

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
