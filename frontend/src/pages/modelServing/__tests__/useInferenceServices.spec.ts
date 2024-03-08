import { act } from '@testing-library/react';
import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { standardUseFetchState, testHook } from '~/__tests__/unit/testUtils/hooks';
import useModelServingEnabled from '~/pages/modelServing/useModelServingEnabled';
import useInferenceServices from '~/pages/modelServing/useInferenceServices';
import { useAccessReview } from '~/api';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockInferenceServiceK8sResource } from '~/__mocks__/mockInferenceServiceK8sResource';
import { InferenceServiceKind } from '~/k8sTypes';

const mockInferenceServices = mockK8sResourceList([
  mockInferenceServiceK8sResource({ name: 'item-1' }),
  mockInferenceServiceK8sResource({ name: 'item-2' }),
]);

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
}));

// Mock the API functions
jest.mock('~/api', () => ({
  ...jest.requireActual('~/api'),
  useAccessReview: jest.fn(),
}));

jest.mock('~/pages/modelServing/useModelServingEnabled', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const k8sListResourceMock = jest.mocked(k8sListResource<InferenceServiceKind>);
const useModelServingEnabledMock = jest.mocked(useModelServingEnabled);
const useAccessReviewMock = jest.mocked(useAccessReview);

describe('useInferenceServices', () => {
  it('should return successful list of InferenceService when model serving is enabled and access review allows', async () => {
    // Mock the return value of useModelServingEnabled
    useModelServingEnabledMock.mockReturnValue(true);
    // Mock the return value of useAccessReview
    useAccessReviewMock.mockReturnValue([true, true]);

    k8sListResourceMock.mockResolvedValue(mockInferenceServices);
    const renderResult = testHook(useInferenceServices)('namespace');
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState(mockInferenceServices.items, true),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([false, false, true, true]);

    // refresh
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([...mockInferenceServices.items]));
    await act(() => renderResult.result.current[3]());
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState([...mockInferenceServices.items], true),
    );
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([false, true, true, true]);
  });

  it('should return successful list of InferenceService when model serving is enabled and access review allows without namespace', async () => {
    // Mock the return value of useModelServingEnabled
    useModelServingEnabledMock.mockReturnValue(true);
    // Mock the return value of useAccessReview
    useAccessReviewMock.mockReturnValue([true, true]);

    k8sListResourceMock.mockResolvedValue(mockInferenceServices);
    const renderResult = testHook(useInferenceServices)();
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState(mockInferenceServices.items, true),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([false, false, true, true]);

    // refresh
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([...mockInferenceServices.items]));
    await act(() => renderResult.result.current[3]());
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState([...mockInferenceServices.items], true),
    );
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([false, true, true, true]);
  });

  it('should not call k8sListResouce when Model Serving is not enabled', async () => {
    // Mock the return value of useModelServingEnabled
    useModelServingEnabledMock.mockReturnValue(false);
    // Mock the return value of useAccessReview
    useAccessReviewMock.mockReturnValue([true, true]);

    const renderResult = testHook(useInferenceServices)('namespace');
    expect(k8sListResourceMock).not.toHaveBeenCalled();
    expect(renderResult).hookToStrictEqual(standardUseFetchState([], false));
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should not call k8sListResouce when Fetch is not ready', async () => {
    // Mock the return value of useModelServingEnabled
    useModelServingEnabledMock.mockReturnValue(true);
    // Mock the return value of useAccessReview
    useAccessReviewMock.mockReturnValue([true, false]);

    const renderResult = testHook(useInferenceServices)('namespace');
    expect(k8sListResourceMock).not.toHaveBeenCalled();
    expect(renderResult).hookToStrictEqual(standardUseFetchState([], false));
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('when allowCreate is false, getInferenceServiceContext is called', async () => {
    // Mock the return value of useModelServingEnabled
    useModelServingEnabledMock.mockReturnValue(true);
    // Mock the return value of useAccessReview
    useAccessReviewMock.mockReturnValue([false, true]);

    k8sListResourceMock.mockResolvedValue(mockInferenceServices);
    const renderResult = testHook(useInferenceServices)('namespace');
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState(mockInferenceServices.items, true),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([false, false, true, true]);

    // refresh
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([...mockInferenceServices.items]));
    await act(() => renderResult.result.current[3]());
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState([...mockInferenceServices.items], true),
    );
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([false, true, true, true]);
  });

  it('when allowCreate is true, listInferenceService is called', async () => {
    // Mock the return value of useModelServingEnabled
    useModelServingEnabledMock.mockReturnValue(true);
    // Mock the return value of useAccessReview
    useAccessReviewMock.mockReturnValue([true, true]);

    k8sListResourceMock.mockResolvedValue(mockInferenceServices);
    const renderResult = testHook(useInferenceServices)('namespace');
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState(mockInferenceServices.items, true),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([false, false, true, true]);

    // refresh
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([...mockInferenceServices.items]));
    await act(() => renderResult.result.current[3]());
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState([...mockInferenceServices.items], true),
    );
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([false, true, true, true]);
  });
  it('should fail to fetch InferenceService', async () => {
    useModelServingEnabledMock.mockReturnValue(true);
    k8sListResourceMock.mockRejectedValue(new Error('error'));
    const renderResult = testHook(useInferenceServices)('namespace');
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([], false));
    expect(renderResult).hookToHaveUpdateCount(1);

    // // Wait for the hook to handle the error
    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual(standardUseFetchState([], false, new Error('error')));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([false, true, false, true]);
  });
});
