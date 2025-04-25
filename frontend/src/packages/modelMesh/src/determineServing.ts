import { DeterminePlatformFromProject } from '~/packages/modelServing/types';

export const isProjectModelMesh: DeterminePlatformFromProject = (project) =>
  project.metadata.labels?.['modelmesh-enabled'] === 'true';
