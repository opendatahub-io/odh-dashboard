import { PipelineRunKind, PipelineRunTaskParam } from '~/k8sTypes';
import { genRandomChars } from '~/utilities/string';
import { translateDisplayNameForK8s } from '~/pages/projects/utils';
import { createK8sPipelineRun } from '~/api';
import { EDGE_PIPELINE_NAME, GIT_KEYS } from './const';
import { EdgeModelLocationType, EdgeModelState } from './types';

type assemblePipelineRunParams = {
  data: EdgeModelState;
  namespace: string;
  s3Secret: string;
};

export const assembleEdgePipelineRun = ({
  data,
  namespace,
  s3Secret,
}: assemblePipelineRunParams) => {
  const paramMap = new Map(data.location.map((param) => [param.key, param.value]));

  let pipelineRunParams: PipelineRunTaskParam[];

  const relativePath = paramMap.get(GIT_KEYS.PATH) || '';

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
      value: paramMap.get(data.locationType) ?? '',
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
      value: relativePath ?? '',
    },
  ];

  if (data.locationType === EdgeModelLocationType.S3) {
    pipelineRunParams = [
      ...commonParams,
      {
        name: 's3-bucket-name',
        value: paramMap.get('Name') ?? '',
      },
    ];
  } else {
    const gitRepo = paramMap.get(GIT_KEYS.GIT_REPOSITORY_URL);

    pipelineRunParams = [
      ...commonParams,
      {
        name: 'git-model-repo',
        value: gitRepo ?? '',
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
          persistentVolumeClaim: {
            claimName: 'buildah-cache-pvc',
          },
        },
        {
          name: 's3-secret',
          secret: {
            secretName: s3Secret,
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
      ],
    },
  };

  return resource;
};

export const createEdgePipelineRun = (
  data: EdgeModelState,
  namespace: string,
  s3Secret: string,
) => {
  const pipelineRunResource = assembleEdgePipelineRun({ data, namespace, s3Secret });

  return createK8sPipelineRun(pipelineRunResource);
};
