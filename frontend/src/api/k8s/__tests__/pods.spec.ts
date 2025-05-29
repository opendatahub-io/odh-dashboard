import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { mockPodK8sResource } from '#~/__mocks__/mockPodK8sResource';
import { getPodsForKserve, getPodsForModelMesh, getPodsForNotebook } from '#~/api/k8s/pods';
import { PodModel } from '#~/api/models';
import { PodKind } from '#~/k8sTypes';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
}));

const k8sListResourceMock = jest.mocked(k8sListResource<PodKind>);
const namespace = 'test-project';

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

describe('getPodsForModelMesh', () => {
  const modelmeshName = 'model-test';
  it('should fetch and return list of modelmesh pod', async () => {
    const modelmeshPodMock = mockPodK8sResource({ name: modelmeshName });
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([modelmeshPodMock]));

    const result = await getPodsForModelMesh(namespace, modelmeshName);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: PodModel,
      queryOptions: {
        ns: namespace,
        queryParams: { labelSelector: `name=modelmesh-serving-${modelmeshName}` },
      },
    });
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual([modelmeshPodMock]);
  });

  it('should handle errors and rethrows', async () => {
    k8sListResourceMock.mockRejectedValue(new Error('error1'));

    await expect(getPodsForModelMesh(namespace, modelmeshName)).rejects.toThrow('error1');
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: PodModel,
      queryOptions: {
        ns: namespace,
        queryParams: { labelSelector: `name=modelmesh-serving-${modelmeshName}` },
      },
    });
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
