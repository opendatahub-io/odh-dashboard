import { act } from 'react';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { useWatchImages } from '~/utilities/useWatchImages';
import { listImageStreams } from '~/api';
import { mapImageStreamToImageInfo } from '~/utilities/imageStreamUtils';
import { ImageStreamKind } from '~/k8sTypes';
import { ImageInfo } from '~/types';

jest.mock('~/api', () => ({
  listImageStreams: jest.fn(),
}));
jest.mock('~/utilities/imageStreamUtils', () => ({
  mapImageStreamToImageInfo: jest.fn(),
}));
jest.mock('~/utilities/useDeepCompareMemoize', () => ({
  useDeepCompareMemoize: <T>(v: T) => v,
}));

const listImageStreamsMock = listImageStreams as jest.Mock;
const mapImageStreamToImageInfoMock = mapImageStreamToImageInfo as jest.Mock;

describe('useWatchImages', () => {
  const namespace = 'my-namespace';
  const imageStreams: ImageStreamKind[] = [
    {
      metadata: { name: 'jupyter-image', annotations: {}, labels: {} },
      spec: {},
      status: {},
    } as ImageStreamKind,
  ];
  const mappedImageInfo: ImageInfo = {
    name: 'test-imagestream',
    // eslint-disable-next-line camelcase
    display_name: 'Test Image',
    description:
      'Jupyter notebook image with minimal dependency set to start experimenting with Jupyter environment.',
    order: 1,
    dockerImageRepo:
      'image-registry.openshift-image-registry.svc:5000/opendatahub/jupyter-minimal-notebook',
    tags: [],
    url: 'https://github.com//opendatahub-io/notebooks/tree/main/jupyter/minimal',
    error: '',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty images and not be loaded initially', () => {
    let resolveFn: ((v: ImageStreamKind[]) => void) | undefined;
    listImageStreamsMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFn = resolve;
        }),
    );
    if (resolveFn) {
      resolveFn(imageStreams);
    }
    const renderResult = testHook(useWatchImages)(namespace);
    expect(renderResult.result.current.images).toEqual([]);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.loadError).toBeUndefined();
  });

  it('should return images and set loaded on fetch success', async () => {
    listImageStreamsMock.mockResolvedValue(imageStreams);
    mapImageStreamToImageInfoMock.mockReturnValue(mappedImageInfo);

    const renderResult = testHook(useWatchImages)(namespace);

    await renderResult.waitForNextUpdate();

    expect(listImageStreamsMock).toHaveBeenCalledWith(namespace, 'jupyter');
    expect(mapImageStreamToImageInfoMock).toHaveBeenCalledWith(imageStreams[0], 0, imageStreams);
    expect(renderResult.result.current.images).toEqual([mappedImageInfo]);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.loadError).toBeUndefined();
  });

  it('should set loadError on fetch error', async () => {
    const error = new Error('Error fetching images');
    listImageStreamsMock.mockRejectedValue(error);

    const renderResult = testHook(useWatchImages)(namespace);

    await renderResult.waitForNextUpdate();

    expect(listImageStreamsMock).toHaveBeenCalledWith(namespace, 'jupyter');
    expect(renderResult.result.current.images).toEqual([]);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.loadError).toBe(error);
  });

  it('should not update state after unmount', async () => {
    let resolveFn: ((v: ImageStreamKind[]) => void) | undefined;
    listImageStreamsMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFn = resolve;
        }),
    );
    mapImageStreamToImageInfoMock.mockReturnValue(mappedImageInfo);

    const renderResult = testHook(useWatchImages)(namespace);
    renderResult.unmount();

    await act(async () => {
      if (resolveFn) {
        resolveFn(imageStreams);
      }
    });

    expect(renderResult.result.current.images).toEqual([]);
    expect(renderResult.result.current.loaded).toBe(false);
  });
});
