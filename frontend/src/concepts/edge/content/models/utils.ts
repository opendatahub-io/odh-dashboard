import { PipelineRunKind, PipelineRunTaskParam, SecretKind } from '~/k8sTypes';
import { genRandomChars } from '~/utilities/string';
import { translateDisplayNameForK8s } from '~/pages/projects/utils';
import { createK8sPipelineRun } from '~/api';
import { EdgeModelLocationType, EdgeModelState } from '~/concepts/edge/types';
import { EDGE_PIPELINE_NAME } from '~/concepts/edge/const';
import { EnvVariableDataEntry } from '~/pages/projects/types';
import { FieldOptions } from '~/components/FieldList';
import { EDGE_S3_FIELDS, EDGE_S3_KEYS } from './const';

export const getAdditionalRequiredEdgeS3Fields = (
  additionalRequiredFields?: string[],
): FieldOptions[] =>
  additionalRequiredFields
    ? EDGE_S3_FIELDS.map((field) =>
        additionalRequiredFields.includes(field.key) ? { ...field, isRequired: true } : field,
      )
    : EDGE_S3_FIELDS;

export const isEdgeS3Valid = (
  values: EnvVariableDataEntry[],
  additionalRequiredFields?: string[],
): boolean =>
  values.every(({ key, value }) =>
    getAdditionalRequiredEdgeS3Fields(additionalRequiredFields)
      .filter((field) => field.isRequired)
      .map((field) => field.key)
      .includes(key)
      ? !!value
      : true,
  );

export const assembleEdgePipelineRun = (
  data: EdgeModelState,
  namespace: string,
  s3SecretName?: string,
) => {
  let pipelineRunParams: PipelineRunTaskParam[] = [];

  const commonParams = [
    {
      name: 'model-name',
      value: data.name,
    },
    {
      name: 'model-version',
      value: '1',
    },
    {
      name: 'fetch-model',
      value: data.locationType,
    },
    {
      name: 'test-endpoint',
      value: data.modelInferencingEndpoint,
    },
    {
      name: 'target-imagerepo',
      value: data.outputImageURL,
    },
    {
      name: 'gitServer',
      value: 'https://github.com',
    },
    {
      name: 'gitOrgName',
      value: 'opendatahub-io',
    },
    {
      name: 'gitRepoName',
      value: 'ai-edge',
    },
    {
      name: 'containerfileRelativePath',
      value: 'pipelines/containerfiles/Containerfile.seldonio.mlserver.mlflow',
    },
    {
      name: 'modelRelativePath',
      value: data.modelRelativePath,
    },
  ];

  if (data.locationType === EdgeModelLocationType.S3) {
    pipelineRunParams = [
      ...commonParams,
      {
        name: 's3-bucket-name',
        value: data.s3BucketName ?? '',
      },
    ];
  } else {
    pipelineRunParams = [
      ...commonParams,
      {
        name: 's3-bucket-name',
        value: '',
      },
      {
        name: 'git-model-repo',
        value: data.gitModelRepo ?? '',
      },
      {
        name: 'git-revision',
        value: data.gitRevision ?? '',
      },
    ];
  }

  const resource: PipelineRunKind = {
    apiVersion: 'tekton.dev/v1beta1',
    kind: 'PipelineRun',
    metadata: {
      name: translateDisplayNameForK8s(`${data.name}-${genRandomChars()}`),
      namespace: namespace,
      generateName: 'aiedge-e2e-',
    },
    spec: {
      params: pipelineRunParams,
      pipelineRef: {
        name: EDGE_PIPELINE_NAME,
      },
      serviceAccountName: 'pipeline',
      timeout: '1h0m0s',
      workspaces: [
        {
          name: 'buildah-cache',
          volumeClaimTemplate: {
            spec: {
              accessModes: ['ReadWriteOnce'],
              resources: {
                requests: {
                  storage: '1Gi',
                },
              },
            },
          },
        },
        {
          emptyDir: {},
          name: 'workspace',
        },
        {
          configMap: {
            name: data.testDataResource,
          },
          name: 'test-data',
        },
        {
          name: 's3-secret',
          secret: {
            secretName: s3SecretName ?? '__placeholder',
          },
        },
      ],
    },
  };

  return resource;
};

export const createEdgePipelineRun = (
  data: EdgeModelState,
  namespace: string,
  s3SecretName?: string,
  dryRun = false,
) => {
  const pipelineRunResource = assembleEdgePipelineRun(data, namespace, s3SecretName);

  return createK8sPipelineRun(pipelineRunResource, { dryRun: dryRun });
};

export const assembleEdgeS3Secret = (
  data: EnvVariableDataEntry[],
  modelName: string,
  namespace: string,
): SecretKind => {
  const locationData = new Map(data.map((param) => [param.key, param.value]));
  const name = translateDisplayNameForK8s(`${modelName}-credentials-s3`);

  const storageConfigData = {
    type: 's3',
    // eslint-disable-next-line camelcase
    access_key_id: locationData.get(EDGE_S3_KEYS.ACCESS_KEY_ID),
    // eslint-disable-next-line camelcase
    secret_access_key: locationData.get(EDGE_S3_KEYS.SECRET_ACCESS_KEY),
    // eslint-disable-next-line camelcase
    endpoint_url: locationData.get(EDGE_S3_KEYS.S3_ENDPOINT),
    region: locationData.get(EDGE_S3_KEYS.REGION),
  };

  return {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: name,
      namespace: namespace,
      labels: {
        app: 'rhoai-edge-pipelines',
        'app.kubernetes.io/part-of': 'rhoai-edge-pipelines',
      },
    },
    stringData: {
      's3-storage-config': JSON.stringify(storageConfigData),
    },
  };
};
