import * as React from 'react';
import { useFetchState, FetchStateObject, FetchStateCallbackPromise } from 'mod-arch-core';
import { MaaSModel } from '~/app/types';
import { getMaaSModels } from '~/app/services/llamaStackService';

const useFetchMaaSModels = (namespace: string): FetchStateObject<MaaSModel[]> => {
  const fetchMaaSModels = React.useCallback<FetchStateCallbackPromise<MaaSModel[]>>(
    async () => getMaaSModels(namespace),
    [namespace],
  );

  const [data, loaded, error, refresh] = useFetchState(fetchMaaSModels, [], {
    initialPromisePurity: true,
  });

  return { data, loaded, error, refresh };
};

export default useFetchMaaSModels;
