import {
  k8sCreateResource,
  k8sGetResource,
  k8sListResource,
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

export const getProjects = (translatedUsername: string): Promise<ProjectKind[]> => {
  return k8sListResource<ProjectKind>({
    model: ProjectModel,
    queryOptions: { queryParams: { labelSelector: `opendatahub.io/user=${translatedUsername}` } },
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
          'opendatahub.io/user': translatedUsername,
        },
      },
    },
  });
};
