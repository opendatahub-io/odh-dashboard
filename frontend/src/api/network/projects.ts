import axios from 'axios';
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
import { ODH_PRODUCT_NAME } from '../../utilities/const';
import { listServingRuntimes } from './servingRuntimes';

export const getProject = (projectName: string): Promise<ProjectKind> => {
  return k8sGetResource<ProjectKind>({
    model: ProjectModel,
    queryOptions: { name: projectName },
  });
};

export const getProjects = (withLabel?: string): Promise<ProjectKind[]> => {
  return k8sListResource<ProjectKind>({
    model: ProjectModel,
    queryOptions: withLabel ? { queryParams: { labelSelector: withLabel } } : undefined,
  }).then((listResource) => listResource.items);
};

export const getDSGProjects = (): Promise<ProjectKind[]> => {
  return getProjects('opendatahub.io/dashboard=true');
};

export const createProject = (
  username: string,
  displayName: string,
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

  const name = k8sName || translateDisplayNameForK8s(displayName);

  return new Promise((resolve, reject) => {
    k8sCreateResource<ProjectRequestKind, ProjectKind>({
      model: ProjectRequest,
      resource: {
        apiVersion: 'project.openshift.io/v1',
        kind: 'ProjectRequest',
        metadata: {
          name: k8sName || translateDisplayNameForK8s(name),
        },
        description,
        displayName,
      },
    })
      .then((project) => {
        if (!project) {
          throw new Error('Unable to create a project due to permissions.');
        }

        const projectName = project.metadata.name;

        axios(`/api/namespaces/${projectName}/0`)
          .then((response) => {
            const applied = response.data?.applied ?? false;

            if (!applied) {
              // If we somehow failed, the only solution is for an admin to go add the labels to the Namespace object manually
              throw new Error(
                `Unable to fully create your project. Ask a ${ODH_PRODUCT_NAME} admin for assistance.`,
              );
            }

            resolve(projectName);
          })
          .catch(reject);
      })
      .catch(reject);
  });
};

export const getModelServingProjects = (): Promise<ProjectKind[]> => {
  return getProjects('modelmesh-enabled=true');
};

async function filter(arr, callback) {
  const fail = Symbol();
  return (
    await Promise.all(arr.map(async (item) => ((await callback(item)) ? item : fail)))
  ).filter((i) => i !== fail);
}

export const getModelServingProjectsAvailable = async (): Promise<ProjectKind[]> => {
  return getModelServingProjects().then((projects) => {
    return filter(projects, async (project) => {
      const projectServing = await listServingRuntimes(project.metadata.name);
      return projectServing.length !== 0;
    });
  });
};

export const addSupportModelMeshProject = (name: string): Promise<string> => {
  return axios(`/api/namespaces/${name}/1`).then((response) => {
    const applied = response.data?.applied ?? false;
    if (!applied) {
      throw new Error(
        `Unable to enable model serving in your project. Ask a ${ODH_PRODUCT_NAME} admin for assistance.`,
      );
    }
    return name;
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
