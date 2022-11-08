import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  K8sModelCommon,
  K8sResourceCommon,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { ProjectKind } from '../../k8sTypes';
import { ProjectModel } from '../models';
import { translateDisplayNameForK8s } from '../../pages/projects/utils';
import { addDSGId, hasDSGId } from '../../pages/projects/projectNameUtils';

export const getProject = (projectName: string): Promise<ProjectKind> => {
  return k8sGetResource<ProjectKind>({
    model: ProjectModel,
    queryOptions: { name: projectName },
  });
};

export const getProjects = (): Promise<ProjectKind[]> => {
  return k8sListResource<ProjectKind>({
    model: ProjectModel,
  }).then((listResource) => listResource.items);
};

export const getDSGProjects = (): Promise<ProjectKind[]> => {
  return getProjects().then((projects) => {
    return projects.filter((project) =>
      hasDSGId(project.metadata.annotations?.['openshift.io/display-name']),
    );
  });
};

export const createProject = (
  username: string,
  name: string,
  description: string,
  k8sName?: string,
): Promise<string> => {
  // Specific types and models for creating projects
  const ProjectRequest: K8sModelCommon = {
    apiGroup: 'project.openshift.io',
    apiVersion: 'v1',
    kind: 'ProjectRequest',
    plural: 'projectrequests',
  };
  type ProjectRequestKind = K8sResourceCommon & {
    metadata: {
      name: string;
    };
    displayName?: string;
    description?: string;
  };

  return k8sCreateResource<ProjectRequestKind, ProjectKind>({
    model: ProjectRequest,
    resource: {
      apiVersion: 'project.openshift.io/v1',
      kind: 'ProjectRequest',
      metadata: {
        name: k8sName || translateDisplayNameForK8s(name),
      },
      description,
      displayName: addDSGId(name),
    },
  }).then((project) => {
    if (!project) {
      throw new Error('Unable to create a project due to permissions.');
    }
    return project.metadata.name;
  });
};

export const updateProject = (
  editProjectData: ProjectKind,
  displayName: string,
  description: string,
): Promise<ProjectKind> => {
  const resource: ProjectKind = {
    ...editProjectData,
    metadata: {
      ...editProjectData.metadata,
      annotations: {
        ...editProjectData.metadata.annotations,
        'openshift.io/display-name': addDSGId(displayName),
        'openshift.io/description': description,
      },
    },
  };

  return k8sUpdateResource<ProjectKind>({
    model: ProjectModel,
    resource,
  });
};

export const deleteProject = (projectName: string): Promise<ProjectKind> => {
  return k8sDeleteResource<ProjectKind>({
    model: ProjectModel,
    queryOptions: { name: projectName },
  });
};
