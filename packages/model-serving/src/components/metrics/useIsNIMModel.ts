import React from 'react';
import useFetch, {
  NotReadyError,
  type FetchStateCallbackPromise,
} from '@odh-dashboard/ui-core/hooks/useFetch';
import { getServingRuntime } from '@odh-dashboard/internal/api/k8s/servingRuntimes';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import type { InferenceServiceKind, ServingRuntimeKind } from '../../shared';
import { isNIMServingRuntime } from '../../shared/utils/nimUtils';

type NIMModelState = {
  isNIMModel: boolean;
  loading: boolean;
  error?: Error;
};

export const useIsNIMModel = (model: InferenceServiceKind): NIMModelState => {
  const enabled = useIsAreaAvailable(SupportedArea.NIM_MODEL).status;
  const { namespace } = model.metadata;
  const name = model.spec.predictor.model?.runtime;
  const skipped = !enabled || !namespace || !name;
  const fetchRuntime = React.useCallback<FetchStateCallbackPromise<ServingRuntimeKind | null>>(
    (opts) => {
      if (skipped) {
        return Promise.reject(new NotReadyError('No runtime lookup needed'));
      }
      // ProjectDetailsContext/ModelServingContext may already hold this runtime, but their
      // lists are dashboard-label filtered. A cheap direct lookup supports any ServingRuntime.
      return getServingRuntime(name, namespace, opts);
    },
    [skipped, namespace, name],
  );
  const state = useFetch(fetchRuntime, null, { initialPromisePurity: true });
  return {
    isNIMModel: !skipped && state.loaded && isNIMServingRuntime(state.data ?? undefined),
    loading: !skipped && !state.loaded && !state.error,
    error: state.error,
  };
};
