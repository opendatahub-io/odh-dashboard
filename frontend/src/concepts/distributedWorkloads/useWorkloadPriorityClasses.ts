import useK8sWatchResourceList from '@odh-dashboard/ui-core/hooks/useK8sWatchResourceList';
import { groupVersionKind } from '@odh-dashboard/k8s-core/api/k8sUtils';
import { WorkloadPriorityClassKind } from '#~/k8sTypes';
import { WorkloadPriorityClassModel } from '#~/api/models/kueue';
import { CustomWatchK8sResult } from '#~/types';

const useWorkloadPriorityClasses = (): CustomWatchK8sResult<WorkloadPriorityClassKind[]> =>
  useK8sWatchResourceList(
    {
      isList: true,
      groupVersionKind: groupVersionKind(WorkloadPriorityClassModel),
    },
    WorkloadPriorityClassModel,
  );

export default useWorkloadPriorityClasses;
