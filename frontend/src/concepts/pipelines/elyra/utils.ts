import { Patch } from '@openshift/dynamic-plugin-sdk-utils';
import {
  DSPipelineExternalStorageKind,
  ImageStreamSpecTagType,
  K8sAPIOptions,
  KnownLabels,
  NotebookKind,
  RoleBindingKind,
  SecretKind,
} from '~/k8sTypes';
import {
  ELYRA_ROLE_NAME,
  ELYRA_SECRET_DATA_ENDPOINT,
  ELYRA_SECRET_DATA_KEY,
  ELYRA_SECRET_DATA_TYPE,
  ELYRA_SECRET_NAME,
} from '~/concepts/pipelines/elyra/const';
import { Volume, VolumeMount } from '~/types';
import { RUNTIME_MOUNT_PATH } from '~/pages/projects/pvc/const';
import { createRoleBinding, getRoleBinding, patchRoleBindingOwnerRef } from '~/api';
import { experimentsBaseRoute } from '~/routes/pipelines/experiments';
import { getImageVersionDependencies } from '~/pages/projects/screens/spawner/spawnerUtils';

type ElyraRoleBindingOwnerRef = {
  apiVersion: string;
  kind: string;
  name: string;
  uid: string;
};

export const ELYRA_VOLUME_NAME = 'elyra-dsp-details';

export const getElyraServiceAccountRoleBindingName = (notebookName: string): string =>
  `elyra-pipelines-${notebookName}`;

export const getElyraVolumeMount = (): VolumeMount => ({
  name: ELYRA_VOLUME_NAME,
  mountPath: RUNTIME_MOUNT_PATH,
});

export const getElyraVolume = (): Volume => ({
  name: ELYRA_VOLUME_NAME,
  secret: {
    secretName: ELYRA_SECRET_NAME,
    optional: true,
  },
});

export const getElyraRoleBindingOwnerRef = (
  notebookName: string,
  ownerUid: string,
): ElyraRoleBindingOwnerRef => ({
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
  externalStorage: DSPipelineExternalStorageKind,
  dataConnection: SecretKind,
  route: string,
): SecretKind => {
  const { namespace } = dataConnection.metadata;

  if (
    !dataConnection.data?.[externalStorage.s3CredentialsSecret.accessKey] ||
    !dataConnection.data[externalStorage.s3CredentialsSecret.secretKey]
  ) {
    throw new Error(
      'Error generating elyra secret, please check the DataSciencePipelinesApplication CR.',
    );
  }

  return {
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
          engine: 'Argo',
          auth_type: 'KUBERNETES_SERVICE_ACCOUNT_TOKEN',
          api_endpoint: route,
          // Append the id on the end to navigate to the details page for that PipelineRun
          [ELYRA_SECRET_DATA_ENDPOINT]: `${location.origin}${experimentsBaseRoute(namespace)}/`,
          [ELYRA_SECRET_DATA_TYPE]: 'KUBERNETES_SECRET',
          cos_secret: externalStorage.s3CredentialsSecret.secretName,
          cos_endpoint: `${externalStorage.scheme}://${externalStorage.host}`,
          cos_bucket: externalStorage.bucket,
          cos_username: atob(dataConnection.data[externalStorage.s3CredentialsSecret.accessKey]),
          cos_password: atob(dataConnection.data[externalStorage.s3CredentialsSecret.secretKey]),
          runtime_type: 'KUBEFLOW_PIPELINES',
        },
        schema_name: 'kfp',
      }),
      /* eslint-enable camelcase */
    },
  };
};

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
  opts?: K8sAPIOptions,
): Promise<RoleBindingKind | void> => {
  const notebookName = notebook.metadata.name;
  const { namespace } = notebook.metadata;
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
        opts,
      ).catch((e) => {
        // This is not ideal, but it shouldn't impact the starting of the notebook. Let us log it, and mute the error
        // eslint-disable-next-line no-console
        console.error(
          `Could not patch rolebinding to service account for notebook, ${notebookName}; Reason ${e.message}`,
        );
      });
    }
    return createRoleBinding(
      generateElyraServiceAccountRoleBinding(notebookName, namespace, notebookUid),
      opts,
    ).catch((e) => {
      // eslint-disable-next-line no-console
      console.error(
        `Could not create rolebinding to service account for notebook, ${notebookName}; Reason ${e.message}`,
      );
    });
  }

  return undefined;
};

// V2 -> odh-elyra: 3.16
export const isElyraVersionUpToDate = (imageVersion: ImageStreamSpecTagType): boolean => {
  const deps = getImageVersionDependencies(imageVersion);
  return deps.some((dep) => dep.name.toLowerCase() === 'odh-elyra');
};

// V1 -> elyra: 3.15
export const isElyraVersionOutOfDate = (imageVersion: ImageStreamSpecTagType): boolean => {
  const deps = getImageVersionDependencies(imageVersion);
  return deps.some((dep) => dep.name.toLowerCase() === 'elyra');
};
