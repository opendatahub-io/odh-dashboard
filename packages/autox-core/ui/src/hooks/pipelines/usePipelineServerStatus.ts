import { groupVersionKind } from '@odh-dashboard/k8s-core/api/k8sUtils';
import type { K8sResourceCommon } from '@odh-dashboard/k8s-core';
import useK8sWatchResourceList from '@odh-dashboard/ui-core/hooks/useK8sWatchResourceList';

const DataSciencePipelineApplicationModel = {
  apiVersion: 'v1',
  apiGroup: 'datasciencepipelinesapplications.opendatahub.io',
  kind: 'DataSciencePipelinesApplication',
  plural: 'datasciencepipelinesapplications',
} as const;

type DataSciencePipelineApplication = K8sResourceCommon & {
  status?: {
    conditions?: Array<{ type?: string; status?: string }>;
  };
};

export type PipelineServerStatus = {
  loaded: boolean;
  isStarting: boolean;
  error: Error | undefined;
};

/** Watches the DSPA Ready condition so an empty run list isn't mistaken for a ready server. */
export const usePipelineServerStatus = (
  namespace?: string,
  enabled = true,
): PipelineServerStatus => {
  const [dspas, loaded, error] = useK8sWatchResourceList<DataSciencePipelineApplication[]>(
    namespace && enabled
      ? {
          isList: true,
          groupVersionKind: groupVersionKind(DataSciencePipelineApplicationModel),
          namespace,
        }
      : null,
    DataSciencePipelineApplicationModel,
  );

  const isReady = dspas.some((dspa) =>
    dspa.status?.conditions?.some(
      (condition) => condition.type === 'Ready' && condition.status === 'True',
    ),
  );

  return {
    loaded,
    isStarting: loaded && dspas.length > 0 && !isReady,
    error,
  };
};
