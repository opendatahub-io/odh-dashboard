import React from 'react';
import { fetchCollections, fetchAssets, fetchVolumes } from '~/app/api/dataRegistry';
import { AssetResponse, VolumeInfo } from '~/app/types';

export type RegistryAsset = {
  name: string;
  description: string;
  format: string;
  assetType: 'table' | 'volume';
  location: string;
  connectionRef: string;
  labels: string[];
  collection: string;
};

const mapTableAsset = (asset: AssetResponse, collection: string): RegistryAsset => ({
  name: asset.name,
  description: asset.description || '',
  format: asset.format || '',
  assetType: 'table',
  location: asset.location || '',
  connectionRef: asset.connection_ref
    ? asset.connection_ref.type === 'rhai'
      ? asset.connection_ref.secret_name
      : asset.connection_ref.id
    : '',
  labels: asset.labels || [],
  collection,
});

const mapVolumeAsset = (volume: VolumeInfo, collection: string): RegistryAsset => ({
  name: volume.name,
  description: volume.properties?.description || volume.comment || '',
  format: volume['volume-type'] || '',
  assetType: 'volume',
  location: volume['storage-location'] || '',
  connectionRef: volume.properties?.['connection-ref'] || '',
  labels: [],
  collection,
});

export const useAssets = (
  project: string,
): [RegistryAsset[], boolean, Error | undefined, () => void, string[]] => {
  const [assets, setAssets] = React.useState<RegistryAsset[]>([]);
  const [collectionNames, setCollectionNames] = React.useState<string[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const [refreshKey, setRefreshKey] = React.useState(0);

  const refresh = React.useCallback(() => setRefreshKey((k) => k + 1), []);

  React.useEffect(() => {
    if (!project) {
      setAssets([]);
      setCollectionNames([]);
      setLoaded(true);
      return;
    }

    let cancelled = false;
    setAssets([]);
    setCollectionNames([]);
    setLoaded(false);
    setError(undefined);

    fetchCollections(project)
      .then(async (namespacesResponse) => {
        const names = namespacesResponse.namespaces.map((ns) => ns[0]);

        const results = await Promise.all(
          names.map(async (collection) => {
            const [assetsResponse, volumesResponse] = await Promise.all([
              fetchAssets(project, collection),
              fetchVolumes(project, collection),
            ]);

            const tableAssets = assetsResponse.assets.map((a) => mapTableAsset(a, collection));
            const volumeAssets = volumesResponse.volumes.map((v) => mapVolumeAsset(v, collection));

            return [...tableAssets, ...volumeAssets];
          }),
        );

        if (!cancelled) {
          setCollectionNames(names);
          setAssets(results.flat());
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
  }, [project, refreshKey]);

  return [assets, loaded, error, refresh, collectionNames];
};
