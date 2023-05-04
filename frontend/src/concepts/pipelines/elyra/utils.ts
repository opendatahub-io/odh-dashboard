import { Patch } from '@openshift/dynamic-plugin-sdk-utils';
import { AWSSecretKind, KnownLabels, NotebookKind, RoleBindingKind, SecretKind } from '~/k8sTypes';
import { ELYRA_ROLE_NAME, ELYRA_SECRET_NAME } from '~/concepts/pipelines/elyra/const';
import { AWS_KEYS } from '~/pages/projects/dataConnections/const';
import { Volume } from '~/types';

export const getElyraVolume = (): Volume => ({
  name: 'elyra-dsp-details',
  secret: {
    secretName: ELYRA_SECRET_NAME,
  },
});

export const getPipelineSecretPatch = (): Patch => ({
  path: '/spec/template/spec/volumes/-',
  op: 'add',
  value: getElyraVolume(),
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
      display_name: 'ODH_DSP',
      metadata: {
        tags: [],
        display_name: 'ODH_DSP',
        engine: 'Tekton',
        auth_type: 'EXISTING_BEARER_TOKEN',
        api_endpoint: route,
        cos_auth_type: 'USER_CREDENTIALS',
        cos_endpoint: btoa(dataConnectionData[AWS_KEYS.S3_ENDPOINT]),
        cos_bucket: 'default',
        cos_username: btoa(dataConnectionData[AWS_KEYS.ACCESS_KEY_ID]),
        cos_password: btoa(dataConnectionData[AWS_KEYS.SECRET_ACCESS_KEY]),
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
