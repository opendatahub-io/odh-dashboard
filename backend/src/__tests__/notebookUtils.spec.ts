jest.mock('../utils/resourceUtils', () => {
  const original = jest.requireActual('../utils/resourceUtils');
  return {
    ...original,
    getClusterStatus: () => ({ components: { mlflowoperator: { managementState: 'Managed' } } }),
  };
});

import { assembleNotebook } from '../utils/notebookUtils';
import { KubeFastifyInstance, NotebookData, NotebookState } from '../types';

const mockFastify = {
  kube: {
    namespace: 'test-namespace',
    customObjectsApi: {
      getNamespacedCustomObject: jest.fn().mockResolvedValue({
        body: {
          metadata: {
            name: 'code-server-notebook',
            annotations: {},
          },
          status: {
            dockerImageRepository: 'registry.example.com/code-server-notebook',
            tags: [{ tag: '2023.2' }],
          },
          spec: {
            tags: [
              {
                name: '2023.2',
                annotations: {},
                from: {
                  kind: 'DockerImage',
                  name: 'registry.example.com/code-server-notebook:2023.2',
                },
              },
            ],
          },
        },
      }),
    },
  },
  log: {
    error: jest.fn(),
  },
} as unknown as KubeFastifyInstance;

const baseNotebookData: NotebookData = {
  imageName: 'code-server-notebook',
  imageTagName: '2023.2',
  state: NotebookState.Started,
  podSpecOptions: {
    resources: {
      requests: {
        cpu: '1',
        memory: '2Gi',
      },
      limits: {
        cpu: '1',
        memory: '2Gi',
      },
    },
    tolerations: [],
    nodeSelector: {},
    affinity: {},
  },
  envVars: {
    configMap: {},
    secrets: {},
  },
};

describe('assembleNotebook', () => {
  it('includes startupProbe with the correct timing and http settings while preserving existing probes', async () => {
    const notebook = await assembleNotebook(
      mockFastify,
      baseNotebookData,
      'jdoe',
      'http://localhost',
      'jdoe-notebook',
      'test-namespace',
      'jdoe-pvc',
      'jdoe-env',
    );

    const container = notebook.spec.template.spec.containers[0];

    expect(container.startupProbe).toEqual({
      periodSeconds: 10,
      timeoutSeconds: 1,
      successThreshold: 1,
      failureThreshold: 18,
      httpGet: {
        scheme: 'HTTP',
        path: '/notebook/test-namespace/jdoe-notebook/api',
        port: 'notebook-port',
      },
    });
    expect(container.livenessProbe).toEqual({
      initialDelaySeconds: 10,
      periodSeconds: 5,
      timeoutSeconds: 1,
      successThreshold: 1,
      failureThreshold: 3,
      httpGet: {
        scheme: 'HTTP',
        path: '/notebook/test-namespace/jdoe-notebook/api',
        port: 'notebook-port',
      },
    });
    expect(container.readinessProbe).toEqual({
      initialDelaySeconds: 10,
      periodSeconds: 5,
      timeoutSeconds: 1,
      successThreshold: 1,
      failureThreshold: 3,
      httpGet: {
        scheme: 'HTTP',
        path: '/notebook/test-namespace/jdoe-notebook/api',
        port: 'notebook-port',
      },
    });
  });
});
