import { WorkloadPriorityClassKind } from '#~/k8sTypes';
import { WorkloadPriorityClassModel } from '#~/api/models/kueue';
import useK8sWatchResourceList from '#~/utilities/useK8sWatchResourceList';
import { CustomWatchK8sResult } from '#~/types';
import { groupVersionKind } from '#~/api/k8sUtils';

const useWorkloadPriorityClasses = (): CustomWatchK8sResult<WorkloadPriorityClassKind[]> =>
  useK8sWatchResourceList(
    {
      isList: true,
      groupVersionKind: groupVersionKind(WorkloadPriorityClassModel),
    },
    WorkloadPriorityClassModel,
  );

export default useWorkloadPriorityClasses;
