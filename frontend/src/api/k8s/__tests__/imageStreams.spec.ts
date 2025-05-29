import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { listImageStreams } from '~/api/k8s/imageStreams';
import { ImageStreamModel } from '~/api/models';
import { ImageStreamKind } from '~/k8sTypes';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResourceItems: jest.fn(),
}));

const k8sListResourceItemsMock = jest.mocked(k8sListResourceItems<ImageStreamKind>);

describe('listNotebookImageStreams', () => {
  it('should return notebook image streams for image type other', async () => {
    const listNotebookImageStreamsMock = [
      { metadata: { name: 'item 1' } },
      { metadata: { name: 'item 2' } },
    ] as ImageStreamKind[];

    k8sListResourceItemsMock.mockResolvedValue(listNotebookImageStreamsMock);

    const renderResult = await listImageStreams('namespace', 'other');

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
    expect(renderResult).toStrictEqual(listNotebookImageStreamsMock);
  });

  it('should handle queryParams labelSelector undefined by returning all image stream types when no type is specified', async () => {
    const listImageStreamsMock = [
      { metadata: { name: 'item 1' } },
      { metadata: { name: 'item 2' } },
    ] as ImageStreamKind[];

    k8sListResourceItemsMock.mockResolvedValue(listImageStreamsMock);

    const renderResult = await listImageStreams('namespace');

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
    expect(renderResult).toStrictEqual(listImageStreamsMock);
  });

  it('should handle errors and rethrow', async () => {
    k8sListResourceItemsMock.mockRejectedValue(new Error('error1'));

    await expect(listImageStreams('namespace', 'other')).rejects.toThrow('error1');

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

  it('should return BYON image streams when byon type is specified', async () => {
    const imageStreamsMock = [
      { metadata: { name: 'byon-1' } },
      { metadata: { name: 'byon-2' } },
    ] as ImageStreamKind[];

    k8sListResourceItemsMock.mockResolvedValue(imageStreamsMock);

    const renderResult = await listImageStreams('namespace', 'byon');

    expect(k8sListResourceItemsMock).toHaveBeenCalledWith({
      model: ImageStreamModel,
      queryOptions: {
        ns: 'namespace',
        queryParams: {
          labelSelector: 'app.kubernetes.io/created-by=byon',
        },
      },
    });
    expect(renderResult).toStrictEqual(imageStreamsMock);
  });

  it('should return jupyter notebook image stream when specified', async () => {
    const imageStreamsMock = [
      { metadata: { name: 'jupyter-1' } },
      { metadata: { name: 'jupyter-2' } },
    ] as ImageStreamKind[];

    k8sListResourceItemsMock.mockResolvedValue(imageStreamsMock);

    const renderResult = await listImageStreams('namespace', 'jupyter');

    expect(k8sListResourceItemsMock).toHaveBeenCalledWith({
      model: ImageStreamModel,
      queryOptions: {
        ns: 'namespace',
        queryParams: {
          labelSelector: 'opendatahub.io/notebook-image=true',
        },
      },
    });
    expect(renderResult).toStrictEqual(imageStreamsMock);
  });
});
