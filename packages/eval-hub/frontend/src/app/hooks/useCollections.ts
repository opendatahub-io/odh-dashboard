import { useFetchState, FetchStateCallbackPromise } from 'mod-arch-core';
import React from 'react';
import { getCollections } from '~/app/api/k8s';
import { Collection } from '~/app/types';

type UseCollectionsResult = {
  collections: Collection[];
  loaded: boolean;
  loadError: Error | undefined;
};

export const useCollections = (): UseCollectionsResult => {
  const fetchCollections = React.useCallback<FetchStateCallbackPromise<Collection[]>>(
    (opts) => getCollections('')(opts),
    [],
  );

  const [collections, loaded, loadError] = useFetchState<Collection[]>(fetchCollections, [], {
    initialPromisePurity: true,
  });

  return { collections, loaded, loadError };
};
