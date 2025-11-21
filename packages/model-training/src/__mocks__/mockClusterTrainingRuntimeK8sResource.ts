import { ClusterTrainingRuntimeKind } from '@odh-dashboard/model-training/k8sTypes';

type MockClusterTrainingRuntimeConfigType = {
  name?: string;
  numNodes?: number;
  numProcPerNode?: string | number;
  framework?: string;
};

export const mockClusterTrainingRuntimeK8sResource = ({
  name = 'training-cuda128-torch28-py312',
  numNodes = 1,
  numProcPerNode = 'auto',
  framework = 'torch',
}: MockClusterTrainingRuntimeConfigType = {}): ClusterTrainingRuntimeKind => ({
  apiVersion: 'trainer.kubeflow.org/v1alpha1',
  kind: 'ClusterTrainingRuntime',
  metadata: {
    name,
    creationTimestamp: '2025-11-05T14:36:39Z',
    labels: {
      'app.kubernetes.io/component': 'controller',
      'app.kubernetes.io/name': 'trainer',
      [`trainer.kubeflow.org/framework`]: framework,
    },
    resourceVersion: '277649620',
    generation: 2,
  },
  spec: {
    mlPolicy: {
      numNodes,
      torch: {
        numProcPerNode,
      },
    },
    template: {
      spec: {
        replicatedJobs: [
          {
            groupName: 'default',
            name: 'node',
            replicas: 1,
            template: {
              metadata: {
                labels: {
                  'trainer.kubeflow.org/trainjob-ancestor-step': 'trainer',
                },
              },
              spec: {
                template: {
                  metadata: {},
                  spec: {
                    containers: [
                      {
                        image: 'quay.io/rhoai/odh-training-cuda128-torch28-py312-rhel9:rhoai-3.0',
                        name: 'node',
                        resources: {},
                      },
                    ],
                  },
                },
              },
            },
          },
        ],
      },
    },
  },
});
