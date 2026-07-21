import { commonFetch, k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import type { PodKind } from '@odh-dashboard/k8s-core';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { mockPodK8sResource } from '#~/__mocks__/mockPodK8sResource';
import { getPodContainerLogText, getPodsForKserve, getPodsForNotebook } from '#~/api/k8s/pods';
import { PodModel } from '#~/api/models';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
  commonFetch: jest.fn(),
  getK8sResourceURL: jest.fn((model, resource, opts) => {
    const base = `/api/v1/namespaces/${opts.ns}/${model.plural}/${opts.name}`;
    return opts.path ? `${base}/${opts.path}` : base;
  }),
}));

const k8sListResourceMock = jest.mocked(k8sListResource<PodKind>);
const commonFetchMock = jest.mocked(commonFetch);
const namespace = 'test-project';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getPodsForNotebook', () => {
  const notebookName = 'test';
  it('should fetch and return list of notebook pods', async () => {
    const notebookPodMock = mockPodK8sResource({ name: notebookName });
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([notebookPodMock]));

    const result = await getPodsForNotebook(namespace, notebookName);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: PodModel,
      queryOptions: {
        ns: namespace,
        queryParams: { labelSelector: `notebook-name=${notebookName}` },
      },
    });
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual([notebookPodMock]);
  });

  it('should handle errors and rethrows', async () => {
    k8sListResourceMock.mockRejectedValue(new Error('error1'));

    await expect(getPodsForNotebook(namespace, notebookName)).rejects.toThrow('error1');
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: PodModel,
      queryOptions: {
        ns: namespace,
        queryParams: { labelSelector: `notebook-name=${notebookName}` },
      },
    });
  });
});

describe('getPodContainerLogText', () => {
  const podName = 'my-pod';
  const containerName = 'step-main';

  it('should fetch and return log text', async () => {
    const logContent = 'line 1\nline 2\nline 3';
    commonFetchMock.mockResolvedValue({
      text: () => Promise.resolve(logContent),
    } as Response);

    const result = await getPodContainerLogText(namespace, podName, containerName);

    expect(commonFetchMock).toHaveBeenCalledTimes(1);
    expect(commonFetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`log?container=${containerName}`),
      { headers: { Accept: 'text/plain, application/json' } },
      undefined,
      true,
    );
    expect(result).toBe(logContent);
  });

  it('should pass tailLines when tail is specified', async () => {
    commonFetchMock.mockResolvedValue({
      text: () => Promise.resolve('tail log'),
    } as Response);

    await getPodContainerLogText(namespace, podName, containerName, 100);

    expect(commonFetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`log?container=${containerName}&tailLines=100`),
      expect.any(Object),
      undefined,
      true,
    );
  });

  it('should not append tailLines when tail is not specified', async () => {
    commonFetchMock.mockResolvedValue({
      text: () => Promise.resolve('full log'),
    } as Response);

    await getPodContainerLogText(namespace, podName, containerName);

    expect(commonFetchMock).toHaveBeenCalledWith(
      expect.not.stringContaining('tailLines'),
      expect.any(Object),
      undefined,
      true,
    );
  });

  it('should propagate fetch errors', async () => {
    commonFetchMock.mockRejectedValue(new Error('network error'));

    await expect(getPodContainerLogText(namespace, podName, containerName)).rejects.toThrow(
      'network error',
    );
  });
});

describe('getPodsForKserve', () => {
  const kserveName = 'kserve-test';
  it('should fetch and return list of kserve pod', async () => {
    const kservePodMock = mockPodK8sResource({ name: kserveName });
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([kservePodMock]));

    const result = await getPodsForKserve(namespace, kserveName);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: PodModel,
      queryOptions: {
        ns: namespace,
        queryParams: { labelSelector: `serving.kserve.io/inferenceservice=${kserveName}` },
      },
    });
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual([kservePodMock]);
  });

  it('should handle errors and rethrows', async () => {
    k8sListResourceMock.mockRejectedValue(new Error('error1'));

    await expect(getPodsForKserve(namespace, kserveName)).rejects.toThrow('error1');
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: PodModel,
      queryOptions: {
        ns: namespace,
        queryParams: { labelSelector: `serving.kserve.io/inferenceservice=${kserveName}` },
      },
    });
  });
});
