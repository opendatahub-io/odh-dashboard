export const artifactsRootPath = '/develop-train/pipelines/artifacts';
export const globArtifactsAll = `${artifactsRootPath}/*`;

export const artifactsBaseRoute = (namespace: string | undefined): string =>
  !namespace ? artifactsRootPath : `${artifactsRootPath}/${namespace}`;

export const artifactsDetailsRoute = (namespace: string, artifactId: string | number): string =>
  `${artifactsBaseRoute(namespace)}/${artifactId}`;
