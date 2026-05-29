import React from 'react';
import { useCollectionsContext } from '~/app/context/CollectionsContext';

export type CollectionNameMap = Record<string, string>;

export type UseCollectionNameMapResult = {
  collectionNameMap: CollectionNameMap;
  loaded: boolean;
};

/**
 * Returns a lookup map of collection resource ID → display name, derived from
 * the shared CollectionsContext. No additional network request is made; the
 * context fetch is shared with useCollections on the same page tree.
 */
export const useCollectionNameMap = (): UseCollectionNameMapResult => {
  const { response, loaded } = useCollectionsContext();

  const collectionNameMap = React.useMemo<CollectionNameMap>(
    () =>
      Object.fromEntries(
        response.items.map((collection) => [collection.resource.id, collection.name]),
      ),
    [response.items],
  );

  return { collectionNameMap, loaded };
};
