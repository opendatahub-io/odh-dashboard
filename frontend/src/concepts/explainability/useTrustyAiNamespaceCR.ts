import React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { TrustyAiKind } from '~/k8sTypes';
import useBiasMetricsEnabled from './useBiasMetricsEnabled';

type State = TrustyAiKind | null;
const useTrustyAiNamespaceCR = (namespace: string): FetchState<State> => {
  const biasMetricsEnabled = useBiasMetricsEnabled();
  // TODO: the logic needs to be fleshed out once the TrustyAI operator is complete.
  const callback = React.useCallback<FetchStateCallbackPromise<State>>(
    (opts) => {
      if (!biasMetricsEnabled) {
        return Promise.reject(new NotReadyError('Bias metrics is not enabled'));
      }
      return namespace && opts ? Promise.resolve(null) : Promise.reject();
    },
    [namespace, biasMetricsEnabled],
  );

  const state = useFetchState<State>(callback, null, {
    initialPromisePurity: true,
  });

  return state;
};

export default useTrustyAiNamespaceCR;
