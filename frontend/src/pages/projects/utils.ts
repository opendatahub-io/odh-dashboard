import * as React from 'react';
import { K8sDSGResource, NotebookKind, ProjectKind, RoleBindingKind } from '../../k8sTypes';
import { ProjectDetailsContext } from './ProjectDetailsContext';

const getDisplayNameFromK8sResource = (resource: K8sDSGResource): string =>
  resource.metadata.annotations?.['openshift.io/display-name'] || resource.metadata.name;
const getDescriptionFromK8sResource = (resource: K8sDSGResource): string =>
  resource.metadata.annotations?.['openshift.io/description'] || '';

export const getProjectDisplayName = (project: ProjectKind): string =>
  getDisplayNameFromK8sResource(project);

export const getProjectDescription = (project: ProjectKind): string =>
  getDescriptionFromK8sResource(project);

export const useCurrentProjectDisplayName = (): string => {
  const { currentProject } = React.useContext(ProjectDetailsContext);

  return getProjectDisplayName(currentProject);
};

export const getNotebookDisplayName = (notebook: NotebookKind): string =>
  getDisplayNameFromK8sResource(notebook);

export const generateRoleBindingData = (
  dashboardNamespace: string,
  projectName: string,
): RoleBindingKind => {
  const roleBindingName = `${projectName}-image-pullers`;
  const roleBindingObject: RoleBindingKind = {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'RoleBinding',
    metadata: {
      name: roleBindingName,
      namespace: dashboardNamespace,
    },
    roleRef: {
      apiGroup: 'rbac.authorization.k8s.io',
      kind: 'ClusterRole',
      name: 'system:image-puller',
    },
    subjects: [
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'Group',
        name: `system:serviceaccounts:${projectName}`,
      },
    ],
  };
  return roleBindingObject;
};
