import { k8sDeleteResource, K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import { K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { PyTorchJobKind } from './k8sTypes';
import { PyTorchJobModel } from './models';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';

export const usePyTorchJobs = (namespace: string): CustomWatchK8sResult<PyTorchJobKind[]> =>
  useK8sWatchResourceList(
    {
      isList: true,
      groupVersionKind: groupVersionKind(PyTorchJobModel),
      namespace,
    },
    PyTorchJobModel,
  );

export const deletePyTorchJob = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<PyTorchJobKind, K8sStatus>(
    applyK8sAPIOptions(
      {
        model: PyTorchJobModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );
