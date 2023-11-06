import axios from 'axios';
import { Patch } from '@openshift/dynamic-plugin-sdk-utils';
import { AWSSecretKind, KnownLabels, NotebookKind, RoleBindingKind, SecretKind } from '~/k8sTypes';
import {
  ELYRA_ROLE_NAME,
  ELYRA_SECRET_DATA_ENDPOINT,
  ELYRA_SECRET_DATA_KEY,
  ELYRA_SECRET_DATA_TYPE,
  ELYRA_SECRET_NAME,
} from '~/concepts/pipelines/elyra/const';
import { AWS_KEYS } from '~/pages/projects/dataConnections/const';
import { Volume, VolumeMount } from '~/types';
import { RUNTIME_MOUNT_PATH } from '~/pages/projects/pvc/const';
import { getRoleBinding, patchRoleBindingOwnerRef } from '~/api';

export const ELYRA_VOLUME_NAME = 'elyra-dsp-details';

export const getElyraServiceAccountRoleBindingName = (notebookName: string) =>
  `elyra-pipelines-${notebookName}`;

export const getElyraVolumeMount = (): VolumeMount => ({
  name: ELYRA_VOLUME_NAME,
  mountPath: RUNTIME_MOUNT_PATH,
});

export const getElyraVolume = (): Volume => ({
  name: ELYRA_VOLUME_NAME,
  secret: {
    secretName: ELYRA_SECRET_NAME,
  },
});

export const getElyraRoleBindingOwnerRef = (notebookName: string, ownerUid: string) => ({
  apiVersion: 'kubeflow.org/v1beta1',
  kind: 'Notebook',
  name: notebookName,
  uid: ownerUid,
});

export const getPipelineVolumePatch = (): Patch => ({
  path: '/spec/template/spec/volumes/-',
  op: 'add',
  value: getElyraVolume(),
});

export const getPipelineVolumeMountPatch = (): Patch => ({
  // TODO: can we assume first container?
  path: '/spec/template/spec/containers/0/volumeMounts/-',
  op: 'add',
  value: getElyraVolumeMount(),
});

export const currentlyHasPipelines = (notebook: NotebookKind): boolean =>
  !!notebook.spec.template.spec.volumes?.find((v) => v.secret?.secretName === ELYRA_SECRET_NAME);

export const generateElyraSecret = (
  dataConnectionData: AWSSecretKind['data'],
  dataConnectionName: string,
  namespace: string,
  route: string,
): SecretKind => ({
  apiVersion: 'v1',
  kind: 'Secret',
  metadata: {
    name: ELYRA_SECRET_NAME,
    namespace,
  },
  type: 'Opaque',
  stringData: {
    /* eslint-disable camelcase */
    [ELYRA_SECRET_DATA_KEY]: JSON.stringify({
      display_name: 'Data Science Pipeline',
      metadata: {
        tags: [],
        display_name: 'Data Science Pipeline',
        engine: 'Tekton',
        auth_type: 'KUBERNETES_SERVICE_ACCOUNT_TOKEN',
        api_endpoint: route,
        // Append the id on the end to navigate to the details page for that PipelineRun
        [ELYRA_SECRET_DATA_ENDPOINT]: `${location.origin}/pipelineRuns/${namespace}/pipelineRun/view/`,
        [ELYRA_SECRET_DATA_TYPE]: 'KUBERNETES_SECRET',
        cos_secret: dataConnectionName,
        cos_endpoint: atob(dataConnectionData[AWS_KEYS.S3_ENDPOINT]),
        cos_bucket: atob(dataConnectionData[AWS_KEYS.AWS_S3_BUCKET]),
        cos_username: atob(dataConnectionData[AWS_KEYS.ACCESS_KEY_ID]),
        cos_password: atob(dataConnectionData[AWS_KEYS.SECRET_ACCESS_KEY]),
        runtime_type: 'KUBEFLOW_PIPELINES',
      },
      schema_name: 'kfp',
    }),
    /* eslint-enable camelcase */
  },
});

export const generateElyraServiceAccountRoleBinding = (
  notebookName: string,
  namespace: string,
  ownerUid: string,
): RoleBindingKind => ({
  apiVersion: 'rbac.authorization.k8s.io/v1',
  kind: 'RoleBinding',
  metadata: {
    name: getElyraServiceAccountRoleBindingName(notebookName),
    namespace,
    labels: {
      [KnownLabels.DASHBOARD_RESOURCE]: 'true',
    },
    ownerReferences: [getElyraRoleBindingOwnerRef(notebookName, ownerUid)],
  },
  roleRef: {
    apiGroup: 'rbac.authorization.k8s.io',
    kind: 'Role',
    name: ELYRA_ROLE_NAME,
  },
  subjects: [
    {
      kind: 'ServiceAccount',
      name: notebookName,
    },
  ],
});

export const createElyraServiceAccountRoleBinding = async (
  notebook: NotebookKind,
): Promise<RoleBindingKind | void> => {
  const notebookName = notebook.metadata.name;
  const namespace = notebook.metadata.namespace;
  const notebookUid = notebook.metadata.uid;

  // Check if rolebinding is already exists for backward compatibility
  const roleBinding = await getRoleBinding(
    namespace,
    getElyraServiceAccountRoleBindingName(notebookName),
  ).catch((e) => {
    // 404 is not an error
    if (e.statusObject?.code !== 404) {
      // eslint-disable-next-line no-console
      console.error(
        `Could not get rolebinding to service account for notebook, ${notebookName}; Reason ${e.message}`,
      );
    }
    return undefined;
  });

  if (notebookUid) {
    if (roleBinding) {
      const ownerReferences = roleBinding.metadata.ownerReferences || [];
      if (!ownerReferences.find((ownerReference) => ownerReference.uid === notebookUid)) {
        ownerReferences.push(getElyraRoleBindingOwnerRef(notebookName, notebookUid));
      }
      return patchRoleBindingOwnerRef(
        roleBinding.metadata.name,
        roleBinding.metadata.namespace,
        ownerReferences,
      ).catch((e) => {
        // This is not ideal, but it shouldn't impact the starting of the notebook. Let us log it, and mute the error
        // eslint-disable-next-line no-console
        console.error(
          `Could not patch rolebinding to service account for notebook, ${notebookName}; Reason ${e.message}`,
        );
      });
    }

    return axios
      .post('/api/notebooks/api', { notebookName, namespace, notebookUid })
      .then((response) => response.data)
      .catch((e) => {
        throw new Error(
          `Could not create rolebinding to service account for notebook, ${notebookName}; Reason ${e.message}`,
        );
      });
  }

  return undefined;
};
