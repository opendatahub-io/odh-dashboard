import React from 'react';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '~/utilities/useFetchState';
import { TrustyAiKind } from '~/k8sTypes';

type State = TrustyAiKind | null;
const useTrustyAiNamespaceCR = (namespace: string): FetchState<State> => {
  // TODO: the logic needs to be fleshed out once the TrustyAI operator is complete.
  const callback = React.useCallback<FetchStateCallbackPromise<State>>(
    (opts) => (namespace && opts ? Promise.resolve(null) : Promise.reject()),
    [namespace],
  );

  const state = useFetchState<State>(callback, null, {
    initialPromisePurity: true,
  });

  return state;
};

export default useTrustyAiNamespaceCR;
