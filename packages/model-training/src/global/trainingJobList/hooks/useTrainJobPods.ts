import * as React from 'react';
import { PodKind } from '@odh-dashboard/internal/k8sTypes';
import { PodModel } from '@odh-dashboard/internal/api/models/k8s';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import { TrainJobKind } from '../../../k8sTypes';

export const useTrainJobPods = (job: TrainJobKind | null): CustomWatchK8sResult<PodKind[]> => {
  const selector = React.useMemo(() => {
    if (!job?.metadata.name) return undefined;
    return { matchLabels: { 'jobset.sigs.k8s.io/jobset-name': job.metadata.name } };
  }, [job?.metadata.name]);

  return useK8sWatchResourceList<PodKind[]>(
    {
      isList: true,
      groupVersionKind: groupVersionKind(PodModel),
      namespace: job?.metadata.namespace,
      ...(selector && { selector }),
    },
    PodModel,
  );
};
