export const browseUrl = (project?: string): string => {
  const base = '/ai-hub/data/browse';
  if (!project) {
    return base;
  }
  return `${base}?project=${encodeURIComponent(project)}`;
};

export const tableDetailUrl = (project: string, collection: string, name: string): string =>
  `/ai-hub/data/browse/tables/${encodeURIComponent(project)}/${encodeURIComponent(collection)}/${encodeURIComponent(name)}`;

export const volumeDetailUrl = (project: string, collection: string, name: string): string =>
  `/ai-hub/data/browse/volumes/${encodeURIComponent(project)}/${encodeURIComponent(collection)}/${encodeURIComponent(name)}`;

export const collectionDetailUrl = (project: string, collection: string): string =>
  `/ai-hub/data/browse/collections/${encodeURIComponent(project)}/${encodeURIComponent(collection)}`;
