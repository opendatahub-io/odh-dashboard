export const artifactsRootPath = '/artifacts';
export const globArtifactsAll = `${artifactsRootPath}/*`;

export const artifactsBaseRoute = (namespace: string | undefined): string =>
  !namespace ? artifactsRootPath : `${artifactsRootPath}/${namespace}`;
