import type { K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';
import { NIMAccountKind } from '@odh-dashboard/internal/k8sTypes';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import type { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import { NIMAccountModel } from './k8s';

export const useWatchNIMAccounts = (
  namespace?: string,
  opts?: K8sAPIOptions,
): CustomWatchK8sResult<NIMAccountKind[]> =>
  useK8sWatchResourceList<NIMAccountKind[]>(
    namespace
      ? {
          isList: true,
          groupVersionKind: groupVersionKind(NIMAccountModel),
          namespace,
        }
      : null,
    NIMAccountModel,
    opts,
  );
