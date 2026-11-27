import { DEFAULT_COLLECTION_NAME } from '~/app/utilities/collectionConstants';

export type CollectionAssetRef = {
  name: string;
  assetType: 'table' | 'volume';
};

export const COLLECTION_NAME_MAX_LENGTH = 63;
export const COLLECTION_NAME_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

export const collectionNameError = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.length > COLLECTION_NAME_MAX_LENGTH) {
    return 'Name must be 63 characters or fewer.';
  }
  if (!COLLECTION_NAME_REGEX.test(trimmed)) {
    return 'Name must contain only lowercase letters, numbers, and hyphens.';
  }
  return '';
};

export const collectionRenameError = (value: string, currentName: string): string => {
  const formatError = collectionNameError(value);
  if (formatError) {
    return formatError;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed === currentName) {
    return 'Enter a different name.';
  }
  if (trimmed === DEFAULT_COLLECTION_NAME) {
    return 'The default collection already exists.';
  }
  return '';
};

export const parseCollectionDescription = (
  properties: Record<string, string>,
  project: string,
  collection: string,
): string => {
  const nsKey = `_ns_${project}_${collection}`;
  if (properties[nsKey]) {
    try {
      const nsData = JSON.parse(properties[nsKey]);
      return nsData.description || '';
    } catch {
      return properties.description || '';
    }
  }
  return properties.description || '';
};
