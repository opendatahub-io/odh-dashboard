import { deleteCollection, deleteGenericTable, deleteVolume } from '~/app/api/dataRegistry';
import type { CollectionAssetRef } from '~/app/utilities/collectionUtils';

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown error';

const deleteOneAsset = (
  project: string,
  collection: string,
  asset: CollectionAssetRef,
): Promise<void> => {
  const { name, assetType } = asset;
  // The declared union is only table | volume. Widen so a bad runtime value
  // still reaches default instead of being treated as a table.
  const runtimeAssetType: string = assetType;
  switch (runtimeAssetType) {
    case 'volume':
      return deleteVolume(project, collection, name);
    case 'table':
      return deleteGenericTable(project, collection, name);
    default:
      return Promise.reject(new Error(`Asset "${name}" has an unknown type.`));
  }
};

/**
 * Delete every listed asset, then the collection.
 * A failed asset delete stops the loop and leaves the collection in place.
 * Assets deleted before that failure stay deleted. There is no transaction.
 */
export const deleteCollectionWithAssets = async (
  project: string,
  collection: string,
  assets: CollectionAssetRef[],
): Promise<void> => {
  const deleted: string[] = [];
  for (const asset of assets) {
    try {
      await deleteOneAsset(project, collection, asset);
      deleted.push(asset.name);
    } catch (error) {
      const reason = errorMessage(error);
      if (deleted.length === 0) {
        throw new Error(
          `Could not delete asset "${asset.name}". The collection was not deleted. ${reason}`,
        );
      }
      throw new Error(
        `Deleted ${deleted.length} of ${assets.length} assets. Stopped at "${asset.name}": ${reason} The collection was not deleted. Assets already removed stay removed. Retry to continue.`,
      );
    }
  }

  try {
    await deleteCollection(project, collection);
  } catch (error) {
    const reason = errorMessage(error);
    if (assets.length === 0) {
      throw new Error(reason);
    }
    throw new Error(
      `All ${assets.length} assets were deleted, but the collection could not be removed: ${reason} Refresh and try again.`,
    );
  }
};
