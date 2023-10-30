import axios, { AxiosStatic } from 'axios';
import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { NotebookKind } from '~/k8sTypes';
import { createElyraServiceAccountRoleBinding } from '~/concepts/pipelines/elyra/utils';

jest.mock('axios');
jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sGetResource: jest.fn(),
}));
const mockedAxios = axios as jest.Mocked<AxiosStatic>;
const k8sGetResourceMock = k8sGetResource as jest.Mock;
k8sGetResourceMock.mockReturnValue(
  Promise.reject({
    statusObject: {
      code: 404,
    },
  }),
);

const notebook: NotebookKind = {
  apiVersion: 'V1',
  kind: 'notebook',
  metadata: {
    annotations: {},
    resourceVersion: '192563981',
    name: 'test1',
    uid: '637746e3-31a7-4a7f-8903-e9ce8b367c83',
    creationTimestamp: '2023-11-06T06:58:04Z',
    generation: 1,
    managedFields: [],
    namespace: 'pipelinetesting',
    labels: {},
  },
  spec: {
    template: {
      spec: {
        affinity: {},
        containers: [
          {
            resources: {},
            image: '',
            readinessProbe: {},
            name: 'test1',
            livenessProbe: {},
            env: [],
            ports: [],
            imagePullPolicy: 'Always',
            volumeMounts: [],
          },
        ],
        enableServiceLinks: false,
        volumes: [],
      },
    },
  },
  status: {
    conditions: [
      {
        lastProbeTime: '2023-11-06T07:06:56Z',
        lastTransitionTime: '2023-11-06T07:04:53Z',
        status: 'True',
        type: 'Initialized',
      },
    ],
    containerState: {
      terminated: {
        startedAt: '2023-11-06T07:05:02Z',
      },
    },
    readyReplicas: 1,
  },
};
describe('createElyraServiceAccountRoleBinding', () => {
  it('should create a new RoleBinding when it does not exist', async () => {
    mockedAxios.post.mockResolvedValue({ data: 'RoleBindingCreated' });
    const result = await createElyraServiceAccountRoleBinding(notebook);
    expect(axios.post).toHaveBeenCalledWith('/api/notebooks/api', {
      notebookName: 'test1',
      namespace: 'pipelinetesting',
      notebookUid: '637746e3-31a7-4a7f-8903-e9ce8b367c83',
    });
    expect(result).toEqual('RoleBindingCreated');
  });

  it('should handle errors when creating a new role binding', async () => {
    mockedAxios.post.mockRejectedValue({
      statusObject: {
        code: 404,
      },
      message: 'Error message',
    });
    await createElyraServiceAccountRoleBinding(notebook).catch((error) => {
      expect(error.message).toEqual(
        'Could not create rolebinding to service account for notebook, test1; Reason Error message',
      );
    });
  });
});
