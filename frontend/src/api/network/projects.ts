import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  K8sModelCommon,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { ProjectKind } from '../../k8sTypes';
import { usernameTranslate } from '../../utilities/notebookControllerUtils';
import { ProjectModel } from '../models';
import { translateDisplayNameForK8s } from '../../pages/projects/utils';

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
  k8sName?: string,
): Promise<string> => {
  const translatedUsername = usernameTranslate(username);

  // Specific types and models for creating projects
  const NamespaceModel: K8sModelCommon = {
    apiVersion: 'v1',
    kind: 'Namespace',
    plural: 'namespaces',
  };
  type NamespaceKind = ProjectKind & {
    metadata: {
      name: string;
    };
  };

  return new Promise((resolve, reject) => {
    k8sCreateResource<NamespaceKind, NamespaceKind>({
      model: NamespaceModel,
      resource: {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: {
          name: k8sName || translateDisplayNameForK8s(name),
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
    })
      .then((namespace) => {
        if (!namespace) {
          reject('Unable to create a project due to permissions.');
          return;
        }
        resolve(namespace.metadata.name);
      })
      .catch(reject);
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
