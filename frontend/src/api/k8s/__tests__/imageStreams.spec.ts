import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { getNotebookImageStreams } from '#~/api/k8s/imageStreams';
import { ImageStreamModel } from '#~/api/models';
import { ImageStreamKind } from '#~/k8sTypes';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResourceItems: jest.fn(),
}));

const k8sListResourceItemsMock = jest.mocked(k8sListResourceItems<ImageStreamKind>);

describe('getNotebookImageStreams', () => {
  it('should return notebook image streams', async () => {
    const getNotebookImageStreamsMock = [
      { metadata: { name: 'item 1' } },
      { metadata: { name: 'item 2' } },
    ] as ImageStreamKind[];

    k8sListResourceItemsMock.mockResolvedValue(getNotebookImageStreamsMock);

    const renderResult = await getNotebookImageStreams('namespace');

    expect(k8sListResourceItemsMock).toHaveBeenCalledWith({
      model: ImageStreamModel,
      queryOptions: {
        ns: 'namespace',
        queryParams: {
          labelSelector: 'opendatahub.io/notebook-image=true',
        },
      },
    });
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(1);
    expect(renderResult).toStrictEqual(getNotebookImageStreamsMock);
  });

  it('should handle queryParams labelSelector undefined when includeDisabled true', async () => {
    const getNotebookImageStreamsMock = [
      { metadata: { name: 'item 1' } },
      { metadata: { name: 'item 2' } },
    ] as ImageStreamKind[];

    k8sListResourceItemsMock.mockResolvedValue(getNotebookImageStreamsMock);

    const renderResult = await getNotebookImageStreams('namespace', true);

    expect(k8sListResourceItemsMock).toHaveBeenCalledWith({
      model: ImageStreamModel,
      queryOptions: {
        ns: 'namespace',
        queryParams: {
          labelSelector: undefined,
        },
      },
    });
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(1);
    expect(renderResult).toStrictEqual(getNotebookImageStreamsMock);
  });

  it('should handle errors and rethrow', async () => {
    k8sListResourceItemsMock.mockRejectedValue(new Error('error1'));

    await expect(getNotebookImageStreams('namespace')).rejects.toThrow('error1');

    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(1);

    expect(k8sListResourceItemsMock).toHaveBeenCalledWith({
      model: ImageStreamModel,
      queryOptions: {
        ns: 'namespace',
        queryParams: {
          labelSelector: 'opendatahub.io/notebook-image=true',
        },
      },
    });
  });
});
