import { act } from 'react';
import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { mockImageStreamK8sResource } from '~/__mocks__/mockImageStreamK8sResource';
import { testHook, standardUseFetchState } from '~/__tests__/unit/testUtils/hooks';
import { ImageStreamKind } from '~/k8sTypes';
import { mapImageStreamToBYONImage } from '~/utilities/imageStreamUtils';
import { useWatchBYONImages } from '~/utilities/useWatchBYONImages';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResourceItems: jest.fn(),
}));

const k8sListResourceItemsMock = jest.mocked(k8sListResourceItems<ImageStreamKind>);

const defaultBYONLabel = {
  labels: {
    'app.kubernetes.io/created-by': 'byon',
    'opendatahub.io/notebook-image': 'true',
  },
};

describe('useWatchBYONImages', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should return BYON image steams', async () => {
    const mockResource = mockImageStreamK8sResource({
      name: 'byon-image',
      displayName: 'Custom Image',
      opts: { metadata: defaultBYONLabel },
    });
    const mapped = mapImageStreamToBYONImage(mockResource);

    k8sListResourceItemsMock.mockResolvedValue([mockResource]);

    const renderResult = testHook(useWatchBYONImages)('namespace');
    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([mapped], true));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([false, false, true, true]);

    k8sListResourceItemsMock.mockResolvedValue([]);
    await act(() => renderResult.result.current[3]());
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([], true));
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([false, true, true, true]);
  });

  it('handles errors from API', async () => {
    k8sListResourceItemsMock.mockRejectedValue(new Error('error1'));

    const renderResult = testHook(useWatchBYONImages)('namespace');
    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([], false, new Error('error1')));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([true, true, false, true]);

    k8sListResourceItemsMock.mockRejectedValue(new Error('error2'));
    await act(() => renderResult.result.current[3]());
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([], false, new Error('error2')));
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([true, true, false, true]);
  });
});
