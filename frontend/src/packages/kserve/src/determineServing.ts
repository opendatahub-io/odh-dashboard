import { DeterminePlatformFromProject } from '~/packages/modelServing/types';

export const isProjectKServe: DeterminePlatformFromProject = (project) =>
  project.metadata.labels?.['modelmesh-enabled'] === 'false';

export const foo: DeterminePlatformFromProject = () => true;
