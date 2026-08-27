export const browseUrl = (project?: string): string => {
  const base = '..';
  if (!project) {
    return base;
  }
  return `${base}?project=${encodeURIComponent(project)}`;
};

export const tableDetailUrl = (project: string, collection: string, name: string): string =>
  `tables/${encodeURIComponent(project)}/${encodeURIComponent(collection)}/${encodeURIComponent(name)}`;

export const volumeDetailUrl = (project: string, collection: string, name: string): string =>
  `volumes/${encodeURIComponent(project)}/${encodeURIComponent(collection)}/${encodeURIComponent(name)}`;
