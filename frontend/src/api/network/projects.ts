import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { ProjectKind } from '../../k8sTypes';
import { usernameTranslate } from '../../utilities/notebookControllerUtils';
import { genRandomChars } from '../../utilities/string';
import { ProjectModel } from '../models';

export const getProject = (projectName: string): Promise<ProjectKind> => {
  return k8sGetResource<ProjectKind>({
    model: ProjectModel,
    queryOptions: { name: projectName },
  });
};

export const getProjects = (labelSelector?: string): Promise<ProjectKind[]> => {
  const queryOptions = labelSelector ? { queryParams: { labelSelector } } : undefined;
  return k8sListResource<ProjectKind>({
    model: ProjectModel,
    queryOptions,
  }).then((listResource) => listResource.items);
};

export const createProject = (
  username: string,
  name: string,
  description: string,
): Promise<ProjectKind> => {
  const translatedUsername = usernameTranslate(username);

  return k8sCreateResource<ProjectKind>({
    model: ProjectModel,
    resource: {
      apiVersion: 'project.openshift.io/v1',
      kind: 'Project',
      metadata: {
        name: `${translatedUsername}-${genRandomChars()}`,
        annotations: {
          'openshift.io/description': description,
          'openshift.io/display-name': name,
          'openshift.io/requester': username,
        },
        labels: {
          'opendatahub.io/dashboard': 'true',
          'opendatahub.io/user': translatedUsername,
        },
      },
    },
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
        'openshift.io/display-name': displayName,
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
