import React from 'react';
import { useFetchState, type APIOptions, type FetchStateCallbackPromise } from 'mod-arch-core';
import { fetchCollections, fetchAssets, fetchVolumes } from '~/app/api/dataRegistry';
import type { AssetResponse } from '~/app/types';

export type RegistryAsset = {
  name: string;
  description: string;
  format: string;
  assetType: 'table' | 'volume';
  location: string;
  connectionRef: string;
  labels: string[];
  collection: string;
  properties: Record<string, string>;
  /** The original BFF response, including asset-type-specific fields. */
  rawAsset?: AssetResponse;
};

const mapTableAsset = (asset: AssetResponse, collection: string): RegistryAsset => {
  // Extract connection name from ConnectionRef object
  const connectionRef = asset.connection_ref
    ? asset.connection_ref.type === 'secret'
      ? asset.connection_ref.secret_name
      : asset.connection_ref.id
    : '';

  return {
    name: asset.name,
    description: asset.description || '',
    format: asset.format,
    assetType: asset.asset_type,
    location: asset.storage_location || '',
    connectionRef,
    labels: asset.labels || [],
    collection,
    properties: asset.properties || {},
    rawAsset: asset,
  };
};

const mapVolumeAsset = (volume: AssetResponse, collection: string): RegistryAsset => {
  // Extract connection name from ConnectionRef object
  const connectionRef = volume.connection_ref
    ? volume.connection_ref.type === 'secret'
      ? volume.connection_ref.secret_name
      : volume.connection_ref.id
    : '';

  return {
    name: volume.name,
    description: volume.description || '',
    format: volume.format,
    assetType: volume.asset_type,
    location: volume.storage_location || '',
    connectionRef,
    labels: volume.labels || [],
    collection,
    properties: volume.properties || {},
    rawAsset: volume,
  };
};

type AssetsState = {
  assets: RegistryAsset[];
  collectionNames: string[];
};

const EMPTY_ASSETS_STATE: AssetsState = { assets: [], collectionNames: [] };

export const useAssets = (
  project: string,
): [RegistryAsset[], boolean, Error | undefined, () => void, string[]] => {
  const callback = React.useCallback<FetchStateCallbackPromise<AssetsState>>(
    async (opts: APIOptions) => {
      if (!project) {
        return EMPTY_ASSETS_STATE;
      }

      const namespacesResponse = await fetchCollections(project, opts);
      const collectionNames = namespacesResponse.namespaces.map((ns) => ns[0]);
      const results = await Promise.all(
        collectionNames.map(async (collection) => {
          const [assetsResponse, volumesResponse] = await Promise.all([
            fetchAssets(project, collection, opts),
            fetchVolumes(project, collection, opts),
          ]);

          const tableAssets = assetsResponse.assets.map((a) => mapTableAsset(a, collection));
          const volumeAssets = volumesResponse.volumes.map((v) => mapVolumeAsset(v, collection));

          return [...tableAssets, ...volumeAssets];
        }),
      );

      return { assets: results.flat(), collectionNames };
    },
    [project],
  );

  const [state, loaded, error, refresh] = useFetchState(callback, EMPTY_ASSETS_STATE, {
    initialPromisePurity: true,
  });

  return [state.assets, loaded, error, refresh, state.collectionNames];
};
