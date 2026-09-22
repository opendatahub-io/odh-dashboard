import React from 'react';
import { useFetchState, type APIOptions, type FetchStateCallbackPromise } from 'mod-arch-core';
import { fetchCollectionDetails } from '~/app/api/dataRegistry';
import type { RegistryAsset } from '~/app/hooks/useAssets';
import { parseCollectionDescription } from '~/app/utilities/collectionUtils';

export type CollectionInfo = {
  name: string;
  description: string;
  assetNames: string[];
  tableCount: number;
  volumeCount: number;
};

export const useCollections = (
  project: string,
  assets: RegistryAsset[],
  collectionNames: string[],
): [CollectionInfo[], boolean, Error | undefined, () => void] => {
  const namesKey = collectionNames.join(',');
  const assetsKey = JSON.stringify(assets);
  const stableCollectionNames = React.useMemo(
    () => collectionNames,
    // collectionNames identity is normalized by its joined value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [namesKey],
  );
  const stableAssets = React.useMemo(
    () => assets,
    // assets identity is normalized by its serialized value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assetsKey],
  );
  const callback = React.useCallback<FetchStateCallbackPromise<CollectionInfo[]>>(
    async (opts: APIOptions) => {
      if (!project || stableCollectionNames.length === 0) {
        return [];
      }

      const details = await Promise.all(
        stableCollectionNames.map(async (name) => {
          const detail = await fetchCollectionDetails(project, name, opts);
          const collectionAssets = stableAssets.filter((asset) => asset.collection === name);
          return {
            name,
            description: parseCollectionDescription(detail.properties, project, name),
            assetNames: collectionAssets.map((asset) => asset.name),
            tableCount: collectionAssets.filter((asset) => asset.assetType === 'table').length,
            volumeCount: collectionAssets.filter((asset) => asset.assetType === 'volume').length,
          };
        }),
      );

      return details;
    },
    [project, stableAssets, stableCollectionNames],
  );

  return useFetchState(callback, [], { initialPromisePurity: true });
};
