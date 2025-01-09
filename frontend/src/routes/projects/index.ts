const globProjects = 'projects';

export enum ExperimentListTabRoutes {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export const PROJECT_DETAIL_ROUTES = [
  '/projects/:namespace/:section?',
  '/projects/:namespace/:section?/:tab?',
  '/projects/:namespace/:section?/:tab?/:experimentId?',
  '/projects/:namespace/:section?/:tab?/:experimentId?/:runTab?',
];

export const routeProjectsNamespace = (namespace: string): string =>
  `/${globProjects}/${namespace}`;

const projectsRootPath = '/projects';

export const projectsBaseRoute = (namespace?: string): string =>
  !namespace ? projectsRootPath : `${projectsRootPath}/${namespace}`;

export const projectExperimentsRoute = (namespace: string | undefined, tabId: string): string =>
  `${projectsBaseRoute(namespace)}/experiments-and-runs/${tabId}`;

export const projectExperimentRunsRoute = (
  namespace: string | undefined,
  experimentId: string,
  tab?: string,
): string =>
  `${projectExperimentsRoute(namespace, ExperimentListTabRoutes.ACTIVE)}/${experimentId}${
    tab ? `/${tab}` : ''
  }`;

export const projectExperimentArchivedRunsRoute = (
  namespace: string | undefined,
  experimentId: string,
  tab?: string,
): string =>
  `${projectExperimentsRoute(namespace, ExperimentListTabRoutes.ARCHIVED)}/${experimentId}${
    tab ? `/${tab}` : ''
  }`;
