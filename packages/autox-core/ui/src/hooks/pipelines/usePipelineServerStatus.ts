import { groupVersionKind } from '@odh-dashboard/k8s-core/api/k8sUtils';
import type { K8sResourceCommon } from '@odh-dashboard/k8s-core';
import useK8sWatchResourceList from '@odh-dashboard/ui-core/hooks/useK8sWatchResourceList';
import React from 'react';

const READY_CONFIRMATION_DELAY_MS = 2000;

const DataSciencePipelineApplicationModel = {
  apiVersion: 'v1',
  apiGroup: 'datasciencepipelinesapplications.opendatahub.io',
  kind: 'DataSciencePipelinesApplication',
  plural: 'datasciencepipelinesapplications',
} as const;

type DataSciencePipelineApplication = K8sResourceCommon & {
  status?: {
    conditions?: Array<{ type?: string; status?: string; observedGeneration?: number }>;
  };
};

export type PipelineServerStatus = {
  loaded: boolean;
  isStarting: boolean;
  error: Error | undefined;
};

/** Watches DSPA readiness so empty-run actions stay gated while an observed server is starting. */
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

  const hasInvalidConditions = dspas.some((dspa) => {
    const conditions: unknown = dspa.status?.conditions;
    if (conditions === undefined) {
      return false;
    }
    if (!Array.isArray(conditions)) {
      return true;
    }
    return conditions.some(
      (condition: unknown) => typeof condition !== 'object' || condition === null,
    );
  });
  const readinessError =
    error ??
    (hasInvalidConditions
      ? new Error('Pipeline server returned invalid readiness conditions.')
      : undefined);
  const hasReadinessError = Boolean(readinessError);
  const isReady =
    !hasInvalidConditions &&
    dspas.some((dspa) => {
      const generation = dspa.metadata?.generation;
      return dspa.status?.conditions?.some(
        (condition) =>
          condition.type === 'Ready' &&
          condition.status === 'True' &&
          // Ignore a Ready condition from an older generation when the operator reports one.
          (generation === undefined ||
            condition.observedGeneration === undefined ||
            condition.observedGeneration === generation),
      );
    });

  const [confirmedReadyNamespace, setConfirmedReadyNamespace] = React.useState<string>();

  React.useEffect(() => {
    setConfirmedReadyNamespace(undefined);
    if (!namespace || !loaded || hasReadinessError || !isReady) {
      return undefined;
    }

    const timeout = setTimeout(
      () => setConfirmedReadyNamespace(namespace),
      READY_CONFIRMATION_DELAY_MS,
    );
    return () => clearTimeout(timeout);
  }, [namespace, loaded, hasReadinessError, isReady]);

  const isReadyConfirmed = isReady && confirmedReadyNamespace === namespace;
  // Only report startup after observing a DSPA. An empty watch result is inconclusive, so let the
  // experiments page fall back to the BFF state instead of showing the blocking waiting state.
  const isStarting = !readinessError && loaded && dspas.length > 0 && !isReady;

  return {
    // Give the watch a brief chance to deliver an immediate Ready -> Starting transition before
    // showing the empty state and its Create Run action.
    loaded: loaded && (!isReady || isReadyConfirmed),
    isStarting,
    error: readinessError,
  };
};
