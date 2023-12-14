import { EdgeModelPipelineKnownResults } from '~/concepts/edge/types';
import { PipelineRunKind } from '~/k8sTypes';

type mockEdgePipelineRunParams = {
  name?: string;
  namespace?: string;
  version?: string;
  modelName?: string;
  creationTimestamp?: string;
  containerImageUrl?: string;
};

export const mockEdgePipelineRun = ({
  name = 'test-run',
  namespace = 'test-namespace',
  version = '1',
  modelName = 'test-model',
  creationTimestamp = '2023-11-29T03:40:48Z',
  containerImageUrl = 'test-image-url',
}: mockEdgePipelineRunParams): PipelineRunKind => ({
  apiVersion: 'tekton.dev/v1beta1',
  kind: 'PipelineRun',
  metadata: {
    name: name,
    creationTimestamp: creationTimestamp,
    namespace: namespace,
    labels: {
      app: 'TODO-INSERT-AIEDGE-PIPELINE-UNIQUE-APP-LABEL',
      'tekton.dev/pipeline': 'aiedge-e2e',
    },
  },
  spec: {
    pipelineSpec: {
      tasks: [],
    },
    params: [
      {
        name: 'model-name',
        value: modelName,
      },
      {
        name: 'model-version',
        value: version,
      },
      {
        name: 's3-bucket-name',
        value: 'test-bucket',
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
        name: 'fetch-model',
        value: 's3',
      },
      {
        name: 'git-model-repo',
        value: 'https://github.com/opendatahub-io/ai-edge.git',
      },
      {
        name: 'modelRelativePath',
        value: 'pipelines/models/',
      },
      {
        name: 'git-revision',
        value: 'main',
      },
      {
        name: 'test-endpoint',
        value: 'invocations',
      },
      {
        name: 'target-imagerepo',
        value: 'test-repo/testimagebuild',
      },
    ],
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
        name: 's3-secret',
        secret: {
          secretName: 'credentials-s3',
        },
      },
      {
        emptyDir: {},
        name: 'workspace',
      },
      {
        configMap: {
          name: 'bike-rentals-test-data',
        },
        name: 'test-data',
      },
    ],
  },
  status: {
    completionTime: creationTimestamp,
    childReferences: [],
    pipelineSpec: {
      tasks: [],
    },
    pipelineResults: [
      {
        name: EdgeModelPipelineKnownResults.TARGET_REGISTRY_URL,
        value: containerImageUrl,
      },
    ],
    conditions: [
      {
        lastTransitionTime: creationTimestamp,
        message: 'Tasks Completed: 5 (Failed: 1, Cancelled 0), Skipped: 7',
        reason: 'Failed',
        status: 'False',
        type: 'Succeeded',
      },
    ],
    startTime: creationTimestamp,
  },
});
