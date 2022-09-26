import * as React from 'react';
import { ProjectKind } from '../../k8sTypes';
import { ProjectDetailsContext } from './ProjectDetailsContext';

export const getProjectDisplayName = (project: ProjectKind): string =>
  project.metadata.annotations?.['openshift.io/display-name'] || project.metadata.name;

export const useCurrentProjectDisplayName = (): string => {
  const { currentProject } = React.useContext(ProjectDetailsContext);

  return getProjectDisplayName(currentProject);
};
