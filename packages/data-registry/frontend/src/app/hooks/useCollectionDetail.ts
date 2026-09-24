import React from 'react';
import {
  useFetchState,
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
} from 'mod-arch-core';
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
  format: asset.format || '-',
});

const mapVolumeToAsset = (volume: VolumeInfo): CollectionAsset => ({
  name: volume.name,
  assetType: 'volume',
  format: volume['volume-type'] || '-',
});

export const useCollectionDetail = (
  project?: string,
  collection?: string,
): FetchState<CollectionDetail | null> => {
  const callback = React.useCallback<FetchStateCallbackPromise<CollectionDetail | null>>(
    async (opts: APIOptions) => {
      if (!project || !collection) {
        return null;
      }

      const [namespaceResponse, assetsResponse, volumesResponse] = await Promise.all([
        fetchCollectionDetails(project, collection, opts),
        fetchAssets(project, collection, opts),
        fetchVolumes(project, collection, opts),
      ]);

      const tableAssets = (assetsResponse.assets ?? []).map(mapTableToAsset);
      const volumeAssets = (volumesResponse.volumes ?? []).map(mapVolumeToAsset);
      const { properties } = namespaceResponse;

      return {
        name: collection,
        description: parseCollectionDescription(properties, project, collection),
        owner: properties.owner || '-',
        createdAt: properties.created_at || '',
        createdBy: properties.created_by || '',
        assets: [...tableAssets, ...volumeAssets],
        structuredCount: tableAssets.length,
        unstructuredCount: volumeAssets.length,
      };
    },
    [collection, project],
  );

  return useFetchState(callback, null, { initialPromisePurity: true });
};
