import * as React from 'react';
import { DSPipelineKind } from '~/k8sTypes';
import { getPipelinesCR } from '~/api';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '~/utilities/useFetchState';

type State = DSPipelineKind | null;

const usePipelineNamespaceCR = (namespace: string): FetchState<State> => {
  const callback = React.useCallback<FetchStateCallbackPromise<State>>(
    (opts) =>
      getPipelinesCR(namespace, opts).catch((e) => {
        if (e.statusObject?.code === 404) {
          // Not finding is okay, not an error
          return null;
        }
        throw e;
      }),
    [namespace],
  );

  return useFetchState<State>(callback, null);
};

export default usePipelineNamespaceCR;
