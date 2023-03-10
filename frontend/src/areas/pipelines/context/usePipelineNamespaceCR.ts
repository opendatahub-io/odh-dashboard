import * as React from 'react';
import { DSPipelineKind } from '~/k8sTypes';
import { getPipelinesCR } from '~/api';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '~/utilities/useFetchState';

const usePipelineNamespaceCR = (namespace: string): FetchState<DSPipelineKind> => {
  const callback = React.useCallback<FetchStateCallbackPromise<DSPipelineKind>>(
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

  return useFetchState<DSPipelineKind>(callback);
};

export default usePipelineNamespaceCR;
