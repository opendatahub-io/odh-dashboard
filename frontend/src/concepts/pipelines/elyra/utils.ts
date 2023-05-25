import { Patch } from '@openshift/dynamic-plugin-sdk-utils';
import { AWSSecretKind, KnownLabels, NotebookKind, RoleBindingKind, SecretKind } from '~/k8sTypes';
import { ELYRA_ROLE_NAME, ELYRA_SECRET_NAME } from '~/concepts/pipelines/elyra/const';
import { AWS_KEYS } from '~/pages/projects/dataConnections/const';
import { Volume, VolumeMount } from '~/types';
import { RUNTIME_MOUNT_PATH } from '~/pages/projects/pvc/const';

const ELYRA_VOLUME_NAME = 'elyra-dsp-details';

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
    'odh_dsp.json': JSON.stringify({
      display_name: 'Data Science Pipeline',
      metadata: {
        tags: [],
        display_name: 'Data Science Pipeline',
        engine: 'Tekton',
        auth_type: 'KUBERNETES_SERVICE_ACCOUNT_TOKEN',
        api_endpoint: route,
        public_api_endpoint: `${location.origin}/pipelineRuns/${namespace}`,
        cos_auth_type: 'USER_CREDENTIALS',
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
): RoleBindingKind => ({
  apiVersion: 'rbac.authorization.k8s.io/v1',
  kind: 'RoleBinding',
  metadata: {
    name: `elyra-pipelines-${notebookName}`,
    namespace,
    labels: {
      [KnownLabels.DASHBOARD_RESOURCE]: 'true',
    },
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
