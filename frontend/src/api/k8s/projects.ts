import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sListResource,
  K8sResourceCommon,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import axios from '#~/utilities/axios';
import { CustomWatchK8sResult } from '#~/types';
import { K8sAPIOptions, ProjectKind } from '#~/k8sTypes';
import { ProjectModel, ProjectRequestModel } from '#~/api/models';
import { throwErrorFromAxios } from '#~/api/errorUtils';
import { translateDisplayNameForK8s } from '#~/concepts/k8s/utils';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';
import { LABEL_SELECTOR_DASHBOARD_RESOURCE, LABEL_SELECTOR_MODEL_SERVING_PROJECT } from '#~/const';
import { NamespaceApplicationCase } from '#~/pages/projects/types';
import { applyK8sAPIOptions } from '#~/api/apiMergeUtils';
import { groupVersionKind } from '#~/api/k8sUtils';
import useK8sWatchResourceList from '#~/utilities/useK8sWatchResourceList';

export const useProjects = (): CustomWatchK8sResult<ProjectKind[]> =>
  useK8sWatchResourceList(
    {
      isList: true,
      groupVersionKind: groupVersionKind(ProjectModel),
    },
    ProjectModel,
  );

export const getProjects = (withLabel?: string, opts?: K8sAPIOptions): Promise<ProjectKind[]> =>
  k8sListResource<ProjectKind>(
    applyK8sAPIOptions(
      {
        model: ProjectModel,
        queryOptions: withLabel ? { queryParams: { labelSelector: withLabel } } : undefined,
      },
      opts,
    ),
  ).then((listResource) => listResource.items);

export const createProject = (
  username: string,
  displayName: string,
  description: string,
  k8sName?: string,
): Promise<string> => {
  // Specific types and models for creating projects
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
      model: ProjectRequestModel,
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
          .catch(throwErrorFromAxios)
          .catch(reject);
      })
      .catch(reject);
  });
};

export const getModelServingProjects = (opts?: K8sAPIOptions): Promise<ProjectKind[]> =>
  getProjects(`${LABEL_SELECTOR_DASHBOARD_RESOURCE},${LABEL_SELECTOR_MODEL_SERVING_PROJECT}`, opts);

export const addSupportServingPlatformProject = (
  name: string,
  servingPlatform: NamespaceApplicationCase,
  dryRun = false,
): Promise<string> =>
  axios(`/api/namespaces/${name}/${servingPlatform}`, {
    params: dryRun ? { dryRun: 'All' } : {},
  })
    .then((response) => {
      const applied = response.data?.applied ?? false;
      if (!applied) {
        throw new Error(
          `Unable to select a model serving platform in your project. Ask a ${ODH_PRODUCT_NAME} admin for assistance.`,
        );
      }
      return name;
    })
    .catch(throwErrorFromAxios);

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
        'openshift.io/display-name': displayName.trim(),
        'openshift.io/description': description,
      },
    },
  };

  return k8sUpdateResource<ProjectKind>({
    model: ProjectModel,
    resource,
  });
};

export const deleteProject = (projectName: string): Promise<ProjectKind> =>
  k8sDeleteResource<ProjectKind>({
    model: ProjectModel,
    queryOptions: { name: projectName },
  });
