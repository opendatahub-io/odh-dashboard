import {
  k8sCreateResource,
  k8sGetResource,
  k8sPatchResource,
  k8sListResource,
  k8sDeleteResource,
  K8sStatus,
} from '@openshift/dynamic-plugin-sdk-utils';
import { NotebookKind } from '~/k8sTypes';
import { Toleration } from '~/types';
import { mockNotebookK8sResource } from '~/__mocks__/mockNotebookK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mock200Status } from '~/__mocks__/mockK8sStatus';
import { mockRoleBindingK8sResource } from '~/__mocks__/mockRoleBindingK8sResource';
import { mockStartNotebookData } from '~/__mocks__/mockStartNotebookData';

import {
  assembleNotebook,
  createNotebook,
  getNotebook,
  getNotebooks,
  stopNotebook,
  startNotebook,
  deleteNotebook,
  attachNotebookSecret,
  replaceNotebookSecret,
  attachNotebookPVC,
  removeNotebookPVC,
  removeNotebookSecret,
  getStopPatch,
  startPatch,
  mergePatchUpdateNotebook,
  restartNotebook,
} from '~/api/k8s/notebooks';

import {
  createElyraServiceAccountRoleBinding,
  getPipelineVolumePatch,
  getPipelineVolumeMountPatch,
  ELYRA_VOLUME_NAME,
} from '~/concepts/pipelines/elyra/utils';

import { TolerationChanges, getTolerationPatch } from '~/utilities/tolerations';
import { NotebookModel } from '~/api/models';
import { k8sMergePatchResource } from '~/api/k8sUtils';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sCreateResource: jest.fn(),
  k8sDeleteResource: jest.fn(),
  k8sGetResource: jest.fn(),
  k8sListResource: jest.fn(),
  k8sPatchResource: jest.fn(),
}));

jest.mock('~/api/k8sUtils', () => ({
  k8sMergePatchResource: jest.fn(),
}));

jest.mock('~/concepts/pipelines/elyra/utils', () => {
  const originalModule = jest.requireActual('~/concepts/pipelines/elyra/utils');
  return {
    ...originalModule,
    createElyraServiceAccountRoleBinding: jest.fn(),
  };
});

const k8sCreateResourceMock = jest.mocked(k8sCreateResource<NotebookKind>);
const k8sGetResourceMock = jest.mocked(k8sGetResource<NotebookKind>);
const k8sPatchResourceMock = jest.mocked(k8sPatchResource<NotebookKind>);
const k8sListResourceMock = jest.mocked(k8sListResource<NotebookKind>);
const k8sMergePatchResourceMock = jest.mocked(k8sMergePatchResource<NotebookKind>);
const k8sDeleteResourceMock = jest.mocked(k8sDeleteResource<NotebookKind, K8sStatus>);
const createElyraServiceAccountRoleBindingMock = jest.mocked(createElyraServiceAccountRoleBinding);

global.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));

const uid = 'test-uid_notebook';
const username = 'test-user';

describe('assembleNotebook', () => {
  it('should return NotebookKind object with pipelines', () => {
    const canEnablePipelines = true;

    const result = assembleNotebook(mockStartNotebookData({}), username, canEnablePipelines);
    expect(result.apiVersion).toBe('kubeflow.org/v1');
    expect(result.kind).toBe('Notebook');
    expect(result.spec.template.spec.volumes).toStrictEqual([
      { name: 'test-volume', persistentVolumeClaim: { claimName: 'test-volume' } },
      { name: ELYRA_VOLUME_NAME, secret: { secretName: 'ds-pipeline-config', optional: true } },
      { emptyDir: { medium: 'Memory' }, name: 'shm' },
    ]);
    expect(result.spec.template.spec.containers[0].volumeMounts).toStrictEqual([
      { mountPath: '/opt/app-root/src/data', name: 'test-volume' },
      { mountPath: '/opt/app-root/runtimes', name: 'elyra-dsp-details' },
      { mountPath: '/dev/shm', name: 'shm' },
    ]);
  });
  it('should return NotebookKind object with pipelines and volume name is shm', () => {
    const canEnablePipelines = true;

    const result = assembleNotebook(
      mockStartNotebookData({ volumeName: 'shm' }),
      username,
      canEnablePipelines,
    );

    expect(result.apiVersion).toBe('kubeflow.org/v1');
    expect(result.kind).toBe('Notebook');

    expect(result.spec.template.spec.volumes).toStrictEqual([
      { name: 'shm', persistentVolumeClaim: { claimName: 'shm' } },
      { name: 'elyra-dsp-details', secret: { secretName: 'ds-pipeline-config', optional: true } },
    ]);
    expect(result.spec.template.spec.containers[0].volumeMounts).toStrictEqual([
      { mountPath: '/opt/app-root/src/data', name: 'shm' },
      { mountPath: '/opt/app-root/runtimes', name: 'elyra-dsp-details' },
    ]);
  });
  it('should return NotebookKind object with pipelines and volume name is elyra-dsp-details', () => {
    const canEnablePipelines = true;

    const result = assembleNotebook(
      mockStartNotebookData({ volumeName: ELYRA_VOLUME_NAME }),
      username,
      canEnablePipelines,
    );

    expect(result.apiVersion).toBe('kubeflow.org/v1');
    expect(result.kind).toBe('Notebook');
    expect(result.spec.template.spec.volumes).toStrictEqual([
      { name: 'elyra-dsp-details', persistentVolumeClaim: { claimName: 'elyra-dsp-details' } },
      { emptyDir: { medium: 'Memory' }, name: 'shm' },
    ]);
    expect(result.spec.template.spec.containers[0].volumeMounts).toStrictEqual([
      { mountPath: '/opt/app-root/src/data', name: 'elyra-dsp-details' },
      { mountPath: '/dev/shm', name: 'shm' },
    ]);
  });
  it('should set the image display name annotation if imageStream exists', () => {
    const canEnablePipelines = true;

    const result = assembleNotebook(mockStartNotebookData({}), username, canEnablePipelines);

    expect(result.metadata.annotations?.['opendatahub.io/image-display-name']).toEqual(
      'sample-image-stream',
    );
  });

  it('should set the image display name annotation if imageStream does not exist', () => {
    const canEnablePipelines = true;
    const mockNoteBookData = mockStartNotebookData({});
    mockNoteBookData.image.imageStream = undefined;

    const result = assembleNotebook(mockNoteBookData, username, canEnablePipelines);

    expect(result.metadata.annotations?.['opendatahub.io/image-display-name']).toBeUndefined();
  });

  it('should create a notebook with pipelines without volumes and volumes mount', async () => {
    const startNotebookDataMock = mockStartNotebookData({});
    startNotebookDataMock.volumeMounts = undefined;
    startNotebookDataMock.volumes = undefined;

    const notebook = assembleNotebook(startNotebookDataMock, username, true);
    k8sCreateResourceMock.mockResolvedValue(mockNotebookK8sResource({ uid: 'test' }));

    createElyraServiceAccountRoleBindingMock.mockResolvedValue(
      mockRoleBindingK8sResource({ uid: 'test' }),
    );

    const renderResult = await createNotebook(startNotebookDataMock, username, true);

    expect(k8sCreateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: NotebookModel,
      resource: notebook,
      queryOptions: {
        queryParams: {},
      },
    });
    expect(createElyraServiceAccountRoleBindingMock).toHaveBeenCalledWith(
      mockNotebookK8sResource({ uid: 'test' }),
      undefined,
    );
    expect(createElyraServiceAccountRoleBindingMock).toHaveBeenCalledTimes(1);
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).toStrictEqual(mockNotebookK8sResource({ uid: 'test' }));
  });
  it('should create a notebook without pipelines, volumes and volume mounts ', async () => {
    const startNotebookMock = mockStartNotebookData({});
    startNotebookMock.volumes = undefined;
    startNotebookMock.volumeMounts = undefined;
    const notebook = assembleNotebook(startNotebookMock, username, false);
    k8sCreateResourceMock.mockResolvedValue(mockNotebookK8sResource({ uid: 'test' }));

    createElyraServiceAccountRoleBindingMock.mockResolvedValue(
      mockRoleBindingK8sResource({ uid: 'test' }),
    );

    const renderResult = await createNotebook(startNotebookMock, username, false);

    expect(k8sCreateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: NotebookModel,
      resource: notebook,
      queryOptions: {
        queryParams: {},
      },
    });
    expect(createElyraServiceAccountRoleBindingMock).toHaveBeenCalledTimes(0);
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).toStrictEqual(mockNotebookK8sResource({ uid: 'test' }));
  });
});

describe('createNotebook', () => {
  it('should create a notebook without pipelines', async () => {
    const notebook = assembleNotebook(
      mockStartNotebookData({ volumeName: 'test-volume' }),
      username,
      false,
    );

    k8sCreateResourceMock.mockResolvedValue(mockNotebookK8sResource({ uid }));

    const renderResult = await createNotebook(mockStartNotebookData({}), username, false);

    expect(createElyraServiceAccountRoleBinding).not.toHaveBeenCalled();
    expect(k8sCreateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: NotebookModel,
      resource: notebook,
      queryOptions: {
        queryParams: {},
      },
    });
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).toStrictEqual(mockNotebookK8sResource({ uid }));
  });
  it('should create a notebook with pipelines', async () => {
    const notebook = assembleNotebook(mockStartNotebookData({}), username, true);
    k8sCreateResourceMock.mockResolvedValue(mockNotebookK8sResource({ uid }));

    createElyraServiceAccountRoleBindingMock.mockResolvedValue(mockRoleBindingK8sResource({ uid }));

    const renderResult = await createNotebook(mockStartNotebookData({}), username, true);

    expect(k8sCreateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: NotebookModel,
      resource: notebook,
      queryOptions: {
        queryParams: {},
      },
    });
    expect(createElyraServiceAccountRoleBindingMock).toHaveBeenCalledTimes(1);
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).toStrictEqual(mockNotebookK8sResource({ uid }));
  });
  it('should handle errors and rethrow', async () => {
    const notebook = assembleNotebook(mockStartNotebookData({}), username, true);
    k8sCreateResourceMock.mockRejectedValue(new Error('error1'));
    await expect(createNotebook(mockStartNotebookData({}), username, true)).rejects.toThrow(
      'error1',
    );
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sCreateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: NotebookModel,
      resource: notebook,
      queryOptions: {
        queryParams: {},
      },
    });
  });
});

describe('getNotebook', () => {
  it('should get a notebook', async () => {
    const name = 'test-notebook';
    const namespace = 'test-project';

    k8sGetResourceMock.mockResolvedValue(mockNotebookK8sResource({ uid }));

    const renderResult = await getNotebook(name, namespace);

    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      model: NotebookModel,
      queryOptions: { name, ns: namespace },
    });
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).toStrictEqual(mockNotebookK8sResource({ uid }));
  });
  it('should handle errors and rethrow', async () => {
    const name = 'test-notebook';
    const namespace = 'test-project';

    k8sGetResourceMock.mockRejectedValue(new Error('error1'));
    await expect(getNotebook(name, namespace)).rejects.toThrow('error1');
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      model: NotebookModel,
      queryOptions: { name, ns: namespace },
    });
  });
});
describe('getNotebooks', () => {
  it('should get all notebooks', async () => {
    const namespace = 'test-project';
    const mockNotebookK8sResourceData = [mockNotebookK8sResource({ uid, namespace })];
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList(mockNotebookK8sResourceData));

    const renderResult = await getNotebooks(namespace);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: NotebookModel,
      queryOptions: { ns: namespace },
    });
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).toStrictEqual(mockNotebookK8sResourceData);
  });
  it('should handle errors and rethrow', async () => {
    const namespace = 'test-project';

    k8sListResourceMock.mockRejectedValue(new Error('error1'));
    await expect(getNotebooks(namespace)).rejects.toThrow('error1');
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: NotebookModel,
      queryOptions: { ns: namespace },
    });
  });
});
describe('startNotebook', () => {
  it('should start a notebook with pipelines and add tolerations', async () => {
    const tolerationChanges = {
      type: 'add',
      settings: [] as Toleration[],
    } as TolerationChanges;
    const enablePipelines = true;
    const mockNotebook = mockNotebookK8sResource({ uid });

    k8sPatchResourceMock.mockResolvedValue(mockNotebookK8sResource({ uid }));

    const renderResult = await startNotebook(mockNotebook, tolerationChanges, enablePipelines);

    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      model: NotebookModel,
      queryOptions: { name: mockNotebook.metadata.name, ns: mockNotebook.metadata.namespace },
      patches: [
        startPatch,
        getTolerationPatch(tolerationChanges),
        getPipelineVolumePatch(),
        getPipelineVolumeMountPatch(),
      ],
    });
    expect(createElyraServiceAccountRoleBinding).toHaveBeenCalledWith(mockNotebook);
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).toStrictEqual(mockNotebook);
  });
  it('should start a notebook with pipelines and replace tolerations', async () => {
    const tolerationChanges = {
      type: 'replace',
      settings: [] as Toleration[],
    } as TolerationChanges;
    const enablePipelines = true;
    const mockNotebook = mockNotebookK8sResource({ uid });

    k8sPatchResourceMock.mockResolvedValue(mockNotebookK8sResource({ uid }));

    const renderResult = await startNotebook(mockNotebook, tolerationChanges, enablePipelines);

    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      model: NotebookModel,
      queryOptions: { name: mockNotebook.metadata.name, ns: mockNotebook.metadata.namespace },
      patches: [
        startPatch,
        getTolerationPatch(tolerationChanges),
        getPipelineVolumePatch(),
        getPipelineVolumeMountPatch(),
      ],
    });
    expect(createElyraServiceAccountRoleBinding).toHaveBeenCalledWith(mockNotebook);
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).toStrictEqual(mockNotebook);
  });
  it('should start a notebook with pipelines and remove tolerations', async () => {
    const tolerationChanges = {
      type: 'remove',
      settings: [] as Toleration[],
    } as TolerationChanges;
    const enablePipelines = true;
    const mockNotebook = mockNotebookK8sResource({ uid });

    k8sPatchResourceMock.mockResolvedValue(mockNotebookK8sResource({ uid }));

    const renderResult = await startNotebook(mockNotebook, tolerationChanges, enablePipelines);

    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      model: NotebookModel,
      queryOptions: { name: mockNotebook.metadata.name, ns: mockNotebook.metadata.namespace },
      patches: [
        startPatch,
        getTolerationPatch(tolerationChanges),
        getPipelineVolumePatch(),
        getPipelineVolumeMountPatch(),
      ],
    });
    expect(createElyraServiceAccountRoleBinding).toHaveBeenCalledWith(mockNotebook);
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).toStrictEqual(mockNotebook);
  });
  it('should start a notebook without pipelines', async () => {
    const tolerationChanges = {
      type: 'nothing',
      settings: [] as Toleration[],
    } as TolerationChanges;
    const enablePipelines = false;

    const mockNotebook = mockNotebookK8sResource({ uid });
    k8sPatchResourceMock.mockResolvedValue(mockNotebook);

    const renderResult = await startNotebook(mockNotebook, tolerationChanges, enablePipelines);

    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      model: NotebookModel,
      patches: [startPatch],
      queryOptions: { name: mockNotebook.metadata.name, ns: mockNotebook.metadata.namespace },
    });

    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(createElyraServiceAccountRoleBinding).not.toHaveBeenCalled();
    expect(renderResult).toStrictEqual(mockNotebook);
  });
  it('should handle errors and rethrow', async () => {
    const tolerationChanges = {
      type: 'add',
      settings: [] as Toleration[],
    } as TolerationChanges;
    const enablePipelines = true;
    const mockNotebook = mockNotebookK8sResource({ uid });

    k8sPatchResourceMock.mockRejectedValue(new Error('error1'));
    await expect(startNotebook(mockNotebook, tolerationChanges, enablePipelines)).rejects.toThrow(
      'error1',
    );
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      model: NotebookModel,
      queryOptions: { name: mockNotebook.metadata.name, ns: mockNotebook.metadata.namespace },
      patches: [
        startPatch,
        getTolerationPatch(tolerationChanges),
        getPipelineVolumePatch(),
        getPipelineVolumeMountPatch(),
      ],
    });
  });
});
describe('stopNotebook', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2024-04-15T19:38:21Z')));
  it('should stop a notebook', async () => {
    const name = 'test-notebook';
    const namespace = 'test-project';

    const mockNotebook = mockNotebookK8sResource({ uid, name, namespace });

    k8sPatchResourceMock.mockResolvedValue(mockNotebook);

    const renderResult = await stopNotebook(name, namespace);

    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      model: NotebookModel,
      patches: [getStopPatch()],
      queryOptions: { name, ns: namespace },
    });
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).toStrictEqual(mockNotebook);
  });
  it('should handle errors and rethrow', async () => {
    const name = 'test-notebook';
    const namespace = 'test-project';

    k8sPatchResourceMock.mockRejectedValue(new Error('error1'));
    await expect(stopNotebook(name, namespace)).rejects.toThrow('error1');
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      model: NotebookModel,
      patches: [getStopPatch()],
      queryOptions: { name, ns: namespace },
    });
  });
});
describe('updateNotebook', () => {
  it('should update a notebook', async () => {
    const existingNotebook = mockNotebookK8sResource({ uid });
    const notebook = assembleNotebook(
      mockStartNotebookData({ notebookId: existingNotebook.metadata.name }),
      username,
    );

    k8sMergePatchResourceMock.mockResolvedValue(existingNotebook);

    const renderResult = await mergePatchUpdateNotebook(
      existingNotebook,
      mockStartNotebookData({ notebookId: existingNotebook.metadata.name }),
      username,
    );

    expect(k8sMergePatchResourceMock).toHaveBeenCalledWith({
      fetchOptions: {
        requestInit: {},
      },
      model: NotebookModel,
      queryOptions: { queryParams: {} },
      resource: notebook,
    });
    expect(k8sMergePatchResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).toStrictEqual(existingNotebook);
  });
  it('should handle errors and rethrow', async () => {
    const existingNotebook = mockNotebookK8sResource({ uid });
    const notebook = assembleNotebook(
      mockStartNotebookData({ notebookId: existingNotebook.metadata.name }),
      username,
    );

    k8sMergePatchResourceMock.mockRejectedValue(new Error('error1'));
    await expect(
      mergePatchUpdateNotebook(
        existingNotebook,
        mockStartNotebookData({ notebookId: existingNotebook.metadata.name }),
        username,
      ),
    ).rejects.toThrow('error1');
    expect(k8sMergePatchResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sMergePatchResourceMock).toHaveBeenCalledWith({
      fetchOptions: {
        requestInit: {},
      },
      model: NotebookModel,
      queryOptions: { queryParams: {} },
      resource: notebook,
    });
  });
});
describe('deleteNotebook', () => {
  it('should delete a notebook', async () => {
    const name = 'test-notebook';
    const namespace = 'test-project';

    k8sDeleteResourceMock.mockResolvedValue(mock200Status({}));

    const returnStatus = await deleteNotebook(name, namespace);

    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      model: NotebookModel,
      queryOptions: { name, ns: namespace },
    });
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(returnStatus).toStrictEqual(mock200Status({}));
  });
  it('should handle errors and rethrow', async () => {
    const name = 'test-notebook';
    const namespace = 'test-project';

    k8sDeleteResourceMock.mockRejectedValue(new Error('error1'));
    await expect(deleteNotebook(name, namespace)).rejects.toThrow('error1');
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      model: NotebookModel,
      queryOptions: { name, ns: namespace },
    });
  });
});
describe('attachNotebookSecret', () => {
  it('should attach a notebook secret when hasExistingEnvFrom is false', async () => {
    const namespace = 'test-project';
    const notebookName = 'test-notebook';
    const secretName = 'test-secret';
    const hasExistingEnvFrom = false;
    const mockNotebook = mockNotebookK8sResource({ uid });

    k8sPatchResourceMock.mockResolvedValue(mockNotebook);

    const renderResult = await attachNotebookSecret(
      notebookName,
      namespace,
      secretName,
      hasExistingEnvFrom,
    );
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: NotebookModel,
      patches: [
        { op: 'add', path: '/spec/template/spec/containers/0/envFrom', value: [] },
        {
          op: 'add',
          path: '/spec/template/spec/containers/0/envFrom/-',
          value: { secretRef: { name: secretName } },
        },
      ],
      queryOptions: { name: notebookName, ns: namespace, queryParams: {} },
    });

    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).toStrictEqual(mockNotebook);
  });
  it('should attach a notebook secret when hasExistingEnvFrom is true', async () => {
    const namespace = 'test-project';
    const notebookName = 'test-notebook';
    const secretName = 'test-secret';
    const hasExistingEnvFrom = true;
    const mockNotebook = mockNotebookK8sResource({ uid });

    k8sPatchResourceMock.mockResolvedValue(mockNotebook);

    const renderResult = await attachNotebookSecret(
      notebookName,
      namespace,
      secretName,
      hasExistingEnvFrom,
    );
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: NotebookModel,
      patches: [
        {
          op: 'add',
          path: '/spec/template/spec/containers/0/envFrom/-',
          value: { secretRef: { name: secretName } },
        },
      ],
      queryOptions: { name: notebookName, ns: namespace, queryParams: {} },
    });

    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).toStrictEqual(mockNotebook);
  });
  it('should attach a notebook secret with existing envFrom', async () => {
    const namespace = 'test-project';
    const name = 'test-notebook';
    const hasExistingEnvFrom = [
      {
        secretRef: {
          name: 'test-secret',
        },
        configMapRef: {
          name: 'test-configmap',
        },
      },
    ];
    const mockNotebook = mockNotebookK8sResource({ uid });
    k8sPatchResourceMock.mockResolvedValue(mockNotebook);
    const renderResult = await replaceNotebookSecret(name, namespace, hasExistingEnvFrom);
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: NotebookModel,
      patches: [
        {
          op: 'replace',
          path: '/spec/template/spec/containers/0/envFrom',
          value: [{ configMapRef: { name: 'test-configmap' }, secretRef: { name: 'test-secret' } }],
        },
      ],
      queryOptions: { name, ns: namespace, queryParams: {} },
    });
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).toStrictEqual(mockNotebook);
  });
  it('should handle errors and rethrow', async () => {
    const namespace = 'test-project';
    const notebookName = 'test-notebook';
    const secretName = 'test-secret';
    const hasExistingEnvFrom = false;

    k8sPatchResourceMock.mockRejectedValue(new Error('error1'));
    await expect(
      attachNotebookSecret(notebookName, namespace, secretName, hasExistingEnvFrom),
    ).rejects.toThrow('error1');
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: NotebookModel,
      patches: [
        { op: 'add', path: '/spec/template/spec/containers/0/envFrom', value: [] },
        {
          op: 'add',
          path: '/spec/template/spec/containers/0/envFrom/-',
          value: { secretRef: { name: secretName } },
        },
      ],
      queryOptions: { name: notebookName, ns: namespace, queryParams: {} },
    });
  });
});
describe('attachNotebookPVC', () => {
  it('should attach a notebook PVC', async () => {
    const namespace = 'test-project';
    const notebookName = 'test-notebook';
    const pvcName = 'test-pvc';
    const mountSuffix = '/opt/app-root/src/data';
    const mockNotebook = mockNotebookK8sResource({ uid });

    k8sPatchResourceMock.mockResolvedValue(mockNotebook);

    const renderResult = await attachNotebookPVC(notebookName, namespace, pvcName, mountSuffix);

    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: NotebookModel,
      patches: [
        {
          op: 'add',
          path: '/spec/template/spec/volumes/-',
          value: { name: 'test-pvc', persistentVolumeClaim: { claimName: 'test-pvc' } },
        },
        {
          op: 'add',
          path: '/spec/template/spec/containers/0/volumeMounts/-',
          value: { mountPath: '/opt/app-root/src/data', name: 'test-pvc' },
        },
      ],
      queryOptions: { name: notebookName, ns: namespace, queryParams: {} },
    });

    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).toStrictEqual(mockNotebook);
  });
  it('should handle errors and rethrow', async () => {
    const namespace = 'test-project';
    const notebookName = 'test-notebook';
    const pvcName = 'test-pvc';
    const mountSuffix = '/opt/app-root/src/data';

    k8sPatchResourceMock.mockRejectedValue(new Error('error1'));
    await expect(attachNotebookPVC(notebookName, namespace, pvcName, mountSuffix)).rejects.toThrow(
      'error1',
    );
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: NotebookModel,
      patches: [
        {
          op: 'add',
          path: '/spec/template/spec/volumes/-',
          value: { name: 'test-pvc', persistentVolumeClaim: { claimName: 'test-pvc' } },
        },
        {
          op: 'add',
          path: '/spec/template/spec/containers/0/volumeMounts/-',
          value: { mountPath: '/opt/app-root/src/data', name: 'test-pvc' },
        },
      ],
      queryOptions: { name: notebookName, ns: namespace, queryParams: {} },
    });
  });
});
describe('removeNotebookPVC', () => {
  it('should remove notebook PVC', async () => {
    const namespace = 'test-project';
    const notebookName = 'test-notebook';
    const pvcName = 'test-pvc';
    const notebookMock = mockNotebookK8sResource({ uid });

    k8sGetResourceMock.mockResolvedValue(notebookMock);
    k8sPatchResourceMock.mockResolvedValue(notebookMock);

    const renderResult = await removeNotebookPVC(notebookName, namespace, pvcName);

    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      model: NotebookModel,
      queryOptions: { name: notebookName, ns: namespace },
    });

    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: NotebookModel,
      patches: [
        {
          op: 'replace',
          path: '/spec/template/spec/volumes',
          value: [
            { name: notebookName, persistentVolumeClaim: { claimName: notebookName } },
            {
              name: 'test-storage-1',
              persistentVolumeClaim: {
                claimName: 'test-storage-1',
              },
            },
            { name: 'oauth-config', secret: { secretName: 'workbench-oauth-config' } },
            { name: 'tls-certificates', secret: { secretName: 'workbench-tls' } },
          ],
        },
        {
          op: 'replace',
          path: '/spec/template/spec/containers/0/volumeMounts',
          value: [
            { mountPath: '/opt/app-root/src', name: notebookName },
            {
              mountPath: '/opt/app-root/src/root',
              name: 'test-storage-1',
            },
          ],
        },
      ],
      queryOptions: { name: notebookName, ns: namespace, queryParams: {} },
    });

    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).toStrictEqual(mockNotebookK8sResource({ uid }));
  });
  it('should remove notebook PVC without volumes', async () => {
    const namespace = 'test-project';
    const notebookName = 'test-notebook';
    const pvcName = 'test-pvc';
    const notebookMock = mockNotebookK8sResource({ uid });
    notebookMock.spec.template.spec.volumes = undefined;
    notebookMock.spec.template.spec.containers[0].volumeMounts = undefined;

    k8sGetResourceMock.mockResolvedValue(notebookMock);
    k8sPatchResourceMock.mockResolvedValue(notebookMock);

    const renderResult = await removeNotebookPVC(notebookName, namespace, pvcName);
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      model: NotebookModel,
      queryOptions: { name: notebookName, ns: namespace },
    });
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: NotebookModel,
      patches: [
        {
          op: 'replace',
          path: '/spec/template/spec/volumes',
          value: [],
        },
        {
          op: 'replace',
          path: '/spec/template/spec/containers/0/volumeMounts',
          value: [],
        },
      ],
      queryOptions: { name: notebookName, ns: namespace, queryParams: {} },
    });

    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).toStrictEqual(notebookMock);
  });
  it('should handle errors and rethrow', async () => {
    const namespace = 'test-project';
    const notebookName = 'test-notebook';
    const pvcName = 'test-pvc';
    const notebookMock = mockNotebookK8sResource({ uid });

    k8sGetResourceMock.mockResolvedValue(notebookMock);
    k8sPatchResourceMock.mockRejectedValue(new Error('error1'));
    await expect(removeNotebookPVC(notebookName, namespace, pvcName)).rejects.toThrow('error1');
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: NotebookModel,
      patches: [
        {
          op: 'replace',
          path: '/spec/template/spec/volumes',
          value: [
            { name: notebookName, persistentVolumeClaim: { claimName: notebookName } },
            {
              name: 'test-storage-1',
              persistentVolumeClaim: {
                claimName: 'test-storage-1',
              },
            },
            { name: 'oauth-config', secret: { secretName: 'workbench-oauth-config' } },
            { name: 'tls-certificates', secret: { secretName: 'workbench-tls' } },
          ],
        },
        {
          op: 'replace',
          path: '/spec/template/spec/containers/0/volumeMounts',
          value: [
            { mountPath: '/opt/app-root/src', name: notebookName },
            {
              mountPath: '/opt/app-root/src/root',
              name: 'test-storage-1',
            },
          ],
        },
      ],
      queryOptions: { name: notebookName, ns: namespace, queryParams: {} },
    });
  });
});
describe('removeNotebookSecret', () => {
  it('should remove notebook secret', async () => {
    const name = 'test-notebook';
    const namespace = 'test-project';
    const secretName = 'test-secret';
    const notebookMock = mockNotebookK8sResource({ uid });

    k8sGetResourceMock.mockResolvedValue(notebookMock);
    k8sPatchResourceMock.mockResolvedValue(notebookMock);

    const renderResult = await removeNotebookSecret(name, namespace, secretName);
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      model: NotebookModel,
      patches: [
        {
          op: 'replace',
          path: '/spec/template/spec/containers/0/envFrom',
          value: [{ secretRef: { name: 'secret' } }],
        },
      ],
      queryOptions: { name, ns: namespace },
    });
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).toStrictEqual(notebookMock);
  });
  it('should remove notebook secret without volumeMount', async () => {
    const name = 'test-notebook';
    const namespace = 'test-project';
    const secretName = 'test-secret';
    const notebookMock = mockNotebookK8sResource({});

    notebookMock.spec.template.spec.containers[0].envFrom = undefined;
    k8sGetResourceMock.mockResolvedValue(notebookMock);
    k8sPatchResourceMock.mockResolvedValue(notebookMock);

    const renderResult = await removeNotebookSecret(name, namespace, secretName);
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      model: NotebookModel,
      patches: [
        {
          op: 'replace',
          path: '/spec/template/spec/containers/0/envFrom',
          value: [],
        },
      ],
      queryOptions: { name, ns: namespace },
    });
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).toStrictEqual(notebookMock);
  });
  it('should remove notebook secret without volumeMount', async () => {
    const name = 'test-notebook';
    const namespace = 'test-project';
    const secretName = 'test-secret';
    const notebookMock = mockNotebookK8sResource({});

    notebookMock.spec.template.spec.containers[0].envFrom = undefined;
    k8sGetResourceMock.mockResolvedValue(notebookMock);
    k8sPatchResourceMock.mockResolvedValue(notebookMock);

    const renderResult = await removeNotebookSecret(name, namespace, secretName);
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      model: NotebookModel,
      patches: [
        {
          op: 'replace',
          path: '/spec/template/spec/containers/0/envFrom',
          value: [],
        },
      ],
      queryOptions: { name, ns: namespace },
    });
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).toStrictEqual(notebookMock);
  });
  it('should handle errors and rethrow', async () => {
    const name = 'test-notebook';
    const namespace = 'test-project';
    const secretName = 'test-secret';
    const notebookMock = mockNotebookK8sResource({ uid });

    k8sGetResourceMock.mockResolvedValue(notebookMock);
    k8sPatchResourceMock.mockRejectedValue(new Error('error1'));
    await expect(removeNotebookSecret(name, namespace, secretName)).rejects.toThrow('error1');
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      model: NotebookModel,
      patches: [
        {
          op: 'replace',
          path: '/spec/template/spec/containers/0/envFrom',
          value: [{ secretRef: { name: 'secret' } }],
        },
      ],
      queryOptions: { name, ns: namespace },
    });
  });
});

describe('restartNotebook', () => {
  it('should add restart notebook annotation', async () => {
    const name = 'test-notebook';
    const namespace = 'test-project';
    const notebookMock = mockNotebookK8sResource({ uid });

    k8sGetResourceMock.mockResolvedValue(notebookMock);
    k8sPatchResourceMock.mockResolvedValue(notebookMock);

    const renderResult = await restartNotebook(name, namespace);
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: NotebookModel,
      patches: [
        {
          op: 'add',
          path: '/metadata/annotations/notebooks.opendatahub.io~1notebook-restart',
          value: 'true',
        },
      ],
      queryOptions: { name, ns: namespace, queryParams: {} },
    });
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).toStrictEqual(notebookMock);
  });
});
