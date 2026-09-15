export const browseUrl = (project?: string): string => {
  const base = '/ai-hub/data/browse';
  if (!project) {
    return base;
  }
  return `${base}?project=${encodeURIComponent(project)}`;
};

export const assetDetailUrl = (
  project: string,
  collection: string,
  name: string,
  assetType: 'table' | 'volume' = 'table',
): string =>
  `/ai-hub/data/browse/assets/${assetType}/${encodeURIComponent(project)}/${encodeURIComponent(collection)}/${encodeURIComponent(name)}`;

export const collectionDetailUrl = (project: string, collection: string): string =>
  `/ai-hub/data/browse/collections/${encodeURIComponent(project)}/${encodeURIComponent(collection)}`;
