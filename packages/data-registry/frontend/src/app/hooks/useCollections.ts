import React from 'react';
import { fetchCollectionDetails } from '~/app/api/dataRegistry';
import { RegistryAsset } from '~/app/hooks/useAssets';

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
  const [rawCollections, setRawCollections] = React.useState<
    { name: string; description: string }[]
  >([]);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const [refreshKey, setRefreshKey] = React.useState(0);
  const namesKey = collectionNames.join(',');

  const refresh = React.useCallback(() => setRefreshKey((k) => k + 1), []);

  React.useEffect(() => {
    if (!project || collectionNames.length === 0) {
      setRawCollections([]);
      setLoaded(true);
      return;
    }

    let cancelled = false;
    setRawCollections([]);
    setLoaded(false);
    setError(undefined);

    Promise.all(
      collectionNames.map(async (name) => {
        const detail = await fetchCollectionDetails(project, name);
        return {
          name,
          description: detail.properties.description || '',
        };
      }),
    )
      .then((details) => {
        if (!cancelled) {
          setRawCollections(details);
          setLoaded(true);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
    // collectionNames excluded: namesKey (joined string) provides stable identity for the array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, namesKey, refreshKey]);

  const collections = React.useMemo<CollectionInfo[]>(
    () =>
      rawCollections.map((c) => {
        const collectionAssets = assets.filter((a) => a.collection === c.name);
        return {
          name: c.name,
          description: c.description,
          assetNames: collectionAssets.map((a) => a.name),
          tableCount: collectionAssets.filter((a) => a.assetType === 'table').length,
          volumeCount: collectionAssets.filter((a) => a.assetType === 'volume').length,
        };
      }),
    [rawCollections, assets],
  );

  return [collections, loaded, error, refresh];
};
