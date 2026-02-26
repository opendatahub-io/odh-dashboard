import { useFetchState, FetchStateCallbackPromise } from 'mod-arch-core';
import React from 'react';
import { getCollections } from '~/app/api/k8s';
import { Collection } from '~/app/types';

type UseCollectionsResult = {
  collections: Collection[];
  loaded: boolean;
  loadError: Error | undefined;
};

export const useCollections = (namespace: string): UseCollectionsResult => {
  const fetchCollections = React.useCallback<FetchStateCallbackPromise<Collection[]>>(
    (opts) => getCollections('', namespace)(opts),
    [namespace],
  );

  const [collections, loaded, loadError] = useFetchState<Collection[]>(fetchCollections, [], {
    initialPromisePurity: true,
  });

  return { collections, loaded, loadError };
};
