export const browseUrl = (project?: string): string => {
  const base = '..';
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
  `assets/${assetType}/${encodeURIComponent(project)}/${encodeURIComponent(collection)}/${encodeURIComponent(name)}`;
