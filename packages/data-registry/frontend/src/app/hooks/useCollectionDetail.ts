import React from 'react';
import { fetchCollectionDetails, fetchAssets, fetchVolumes } from '~/app/api/dataRegistry';
import type { AssetResponse, VolumeInfo } from '~/app/types';
import { parseCollectionDescription } from '~/app/utilities/collectionUtils';

export type CollectionAsset = {
  name: string;
  assetType: 'table' | 'volume';
  format: string;
};

export type CollectionDetail = {
  name: string;
  description: string;
  owner: string;
  createdAt: string;
  createdBy: string;
  assets: CollectionAsset[];
  structuredCount: number;
  unstructuredCount: number;
};

const mapTableToAsset = (asset: AssetResponse): CollectionAsset => ({
  name: asset.name,
  assetType: 'table',
  format: asset.format || 'Structured',
});

const mapVolumeToAsset = (volume: VolumeInfo): CollectionAsset => ({
  name: volume.name,
  assetType: 'volume',
  format: volume['volume-type'] || 'Unstructured',
});

export const useCollectionDetail = (
  project?: string,
  collection?: string,
): [CollectionDetail | null, boolean, Error | undefined, () => void] => {
  const [detail, setDetail] = React.useState<CollectionDetail | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const [refreshKey, setRefreshKey] = React.useState(0);

  const refresh = React.useCallback(() => setRefreshKey((k) => k + 1), []);

  React.useEffect(() => {
    if (!project || !collection) {
      setDetail(null);
      setLoaded(true);
      return;
    }

    let cancelled = false;
    setDetail(null);
    setLoaded(false);
    setError(undefined);

    Promise.all([
      fetchCollectionDetails(project, collection),
      fetchAssets(project, collection),
      fetchVolumes(project, collection),
    ])
      .then(([namespaceResponse, assetsResponse, volumesResponse]) => {
        if (cancelled) {
          return;
        }

        const tableAssets = assetsResponse.assets.map(mapTableToAsset);
        const volumeAssets = volumesResponse.volumes.map(mapVolumeToAsset);
        const allAssets = [...tableAssets, ...volumeAssets];

        const structuredCount = tableAssets.length;
        const unstructuredCount = volumeAssets.length;

        const description = parseCollectionDescription(
          namespaceResponse.properties,
          project,
          collection,
        );

        // Extract created_at and created_by from properties if available
        const createdAt = namespaceResponse.properties.created_at || '';
        const createdBy = namespaceResponse.properties.created_by || '';

        setDetail({
          name: collection,
          description,
          owner: namespaceResponse.properties.owner || 'system:admin',
          createdAt,
          createdBy,
          assets: allAssets,
          structuredCount,
          unstructuredCount,
        });
        setLoaded(true);
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
  }, [project, collection, refreshKey]);

  return [detail, loaded, error, refresh];
};
