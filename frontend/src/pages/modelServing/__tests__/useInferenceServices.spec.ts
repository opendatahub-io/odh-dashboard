import { act } from 'react';
import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { standardUseFetchStateObject, testHook } from '~/__tests__/unit/testUtils/hooks';
import useModelServingEnabled from '~/pages/modelServing/useModelServingEnabled';
import useInferenceServices from '~/pages/modelServing/useInferenceServices';
import { useAccessReview } from '~/api';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockInferenceServiceK8sResource } from '~/__mocks__/mockInferenceServiceK8sResource';
import { InferenceServiceKind, KnownLabels } from '~/k8sTypes';

const mockInferenceServices = [
  mockInferenceServiceK8sResource({ name: 'item-1' }),
  mockInferenceServiceK8sResource({ name: 'item-2' }),
  mockInferenceServiceK8sResource({
    name: 'item-3',
    additionalLabels: {
      [KnownLabels.REGISTERED_MODEL_ID]: '1',
      [KnownLabels.MODEL_VERSION_ID]: '2',
      [KnownLabels.MODEL_REGISTRY_NAME]: 'test-registry',
    },
  }),
  mockInferenceServiceK8sResource({
    name: 'item-4',
    additionalLabels: {
      [KnownLabels.REGISTERED_MODEL_ID]: '1',
      [KnownLabels.MODEL_VERSION_ID]: '2',
      [KnownLabels.MODEL_REGISTRY_NAME]: 'test-registry-2',
    },
  }),
];

const mockInferenceServicesList = mockK8sResourceList(mockInferenceServices);

const mockInferenceServicesListWithNonDashboardItems = mockK8sResourceList([
  ...mockInferenceServices,
  mockInferenceServiceK8sResource({ name: 'item-5', isNonDashboardItem: true }),
  mockInferenceServiceK8sResource({ name: 'item-6', isNonDashboardItem: true }),
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

    k8sListResourceMock.mockResolvedValue(mockInferenceServicesList);
    const renderResult = testHook(useInferenceServices)('namespace');
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: { hasNonDashboardItems: false, items: [] } }),
    );
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: { hasNonDashboardItems: false, items: mockInferenceServicesList.items },
        loaded: true,
      }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable({ data: false, loaded: false, error: true, refresh: true });

    // refresh
    k8sListResourceMock.mockResolvedValue(
      mockK8sResourceList([...mockInferenceServicesList.items]),
    );
    await act(() => renderResult.result.current.refresh());
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: { hasNonDashboardItems: false, items: [...mockInferenceServicesList.items] },
        loaded: true,
      }),
    );
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable({ data: false, loaded: true, error: true, refresh: true });
  });

  it('should return successful list of InferenceService when model serving is enabled and access review allows without namespace', async () => {
    // Mock the return value of useModelServingEnabled
    useModelServingEnabledMock.mockReturnValue(true);
    // Mock the return value of useAccessReview
    useAccessReviewMock.mockReturnValue([true, true]);

    k8sListResourceMock.mockResolvedValue(mockInferenceServicesList);
    const renderResult = testHook(useInferenceServices)();
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: { hasNonDashboardItems: false, items: [] } }),
    );
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: { hasNonDashboardItems: false, items: mockInferenceServicesList.items },
        loaded: true,
      }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable({ data: false, loaded: false, error: true, refresh: true });

    // refresh
    k8sListResourceMock.mockResolvedValue(
      mockK8sResourceList([...mockInferenceServicesList.items]),
    );
    await act(() => renderResult.result.current.refresh());
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: { hasNonDashboardItems: false, items: [...mockInferenceServicesList.items] },
        loaded: true,
      }),
    );
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable({ data: false, loaded: true, error: true, refresh: true });
  });

  it('should not call k8sListResouce when Model Serving is not enabled', async () => {
    // Mock the return value of useModelServingEnabled
    useModelServingEnabledMock.mockReturnValue(false);
    // Mock the return value of useAccessReview
    useAccessReviewMock.mockReturnValue([true, true]);

    const renderResult = testHook(useInferenceServices)('namespace');
    expect(k8sListResourceMock).not.toHaveBeenCalled();
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: { hasNonDashboardItems: false, items: [] } }),
    );
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should not call k8sListResouce when Fetch is not ready', async () => {
    // Mock the return value of useModelServingEnabled
    useModelServingEnabledMock.mockReturnValue(true);
    // Mock the return value of useAccessReview
    useAccessReviewMock.mockReturnValue([true, false]);

    const renderResult = testHook(useInferenceServices)('namespace');
    expect(k8sListResourceMock).not.toHaveBeenCalled();
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: { hasNonDashboardItems: false, items: [] } }),
    );
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('when allowCreate is false, getInferenceServiceContext is called', async () => {
    // Mock the return value of useModelServingEnabled
    useModelServingEnabledMock.mockReturnValue(true);
    // Mock the return value of useAccessReview
    useAccessReviewMock.mockReturnValue([false, true]);

    k8sListResourceMock.mockResolvedValue(mockInferenceServicesList);
    const renderResult = testHook(useInferenceServices)('namespace');
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: { hasNonDashboardItems: false, items: [] } }),
    );
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: { hasNonDashboardItems: false, items: mockInferenceServicesList.items },
        loaded: true,
      }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable({ data: false, loaded: false, error: true, refresh: true });

    // refresh
    k8sListResourceMock.mockResolvedValue(
      mockK8sResourceList([...mockInferenceServicesList.items]),
    );
    await act(() => renderResult.result.current.refresh());
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: { hasNonDashboardItems: false, items: [...mockInferenceServicesList.items] },
        loaded: true,
      }),
    );
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable({ data: false, loaded: true, error: true, refresh: true });
  });

  it('when allowCreate is true, listInferenceService is called', async () => {
    // Mock the return value of useModelServingEnabled
    useModelServingEnabledMock.mockReturnValue(true);
    // Mock the return value of useAccessReview
    useAccessReviewMock.mockReturnValue([true, true]);

    k8sListResourceMock.mockResolvedValue(mockInferenceServicesList);
    const renderResult = testHook(useInferenceServices)('namespace');
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: { hasNonDashboardItems: false, items: [] } }),
    );
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: { hasNonDashboardItems: false, items: mockInferenceServicesList.items },
        loaded: true,
      }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable({ data: false, loaded: false, error: true, refresh: true });

    // refresh
    k8sListResourceMock.mockResolvedValue(
      mockK8sResourceList([...mockInferenceServicesList.items]),
    );
    await act(() => renderResult.result.current.refresh());
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: { hasNonDashboardItems: false, items: [...mockInferenceServicesList.items] },
        loaded: true,
      }),
    );
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable({ data: false, loaded: true, error: true, refresh: true });
  });

  it('should fail to fetch InferenceService', async () => {
    useModelServingEnabledMock.mockReturnValue(true);
    k8sListResourceMock.mockRejectedValue(new Error('error'));
    const renderResult = testHook(useInferenceServices)('namespace');
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: { hasNonDashboardItems: false, items: [] } }),
    );
    expect(renderResult).hookToHaveUpdateCount(1);

    // // Wait for the hook to handle the error
    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: { hasNonDashboardItems: false, items: [] },
        loaded: false,
        error: new Error('error'),
      }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable({ data: false, loaded: true, error: false, refresh: true });
  });

  it('has no labelSelector by default', async () => {
    useModelServingEnabledMock.mockReturnValue(true);
    useAccessReviewMock.mockReturnValue([true, true]);
    k8sListResourceMock.mockResolvedValue(mockInferenceServicesList);

    testHook(useInferenceServices)();

    expect(k8sListResourceMock.mock.calls[0][0].queryOptions?.queryParams).toEqual({});
  });

  it('includes "registered-model-id" labelSelector when "registeredModelId" is specified', async () => {
    useModelServingEnabledMock.mockReturnValue(true);
    useAccessReviewMock.mockReturnValue([true, true]);
    k8sListResourceMock.mockResolvedValue(mockInferenceServicesList);

    testHook(useInferenceServices)(undefined, 'some-registered-model-id');

    expect(k8sListResourceMock.mock.calls[0][0].queryOptions?.queryParams).toEqual({
      labelSelector: 'modelregistry.opendatahub.io/registered-model-id=some-registered-model-id',
    });
  });

  it('includes "model-version-id" labelSelector when "modelVersionId" is specified', async () => {
    useModelServingEnabledMock.mockReturnValue(true);
    useAccessReviewMock.mockReturnValue([true, true]);
    k8sListResourceMock.mockResolvedValue(mockInferenceServicesList);

    testHook(useInferenceServices)(undefined, undefined, 'some-model-version-id');

    expect(k8sListResourceMock.mock.calls[0][0].queryOptions?.queryParams).toEqual({
      labelSelector: 'modelregistry.opendatahub.io/model-version-id=some-model-version-id',
    });
  });

  it('includes appropriate labelSelectors when "modelVersionId" and "registeredModelId" are specified', async () => {
    useModelServingEnabledMock.mockReturnValue(true);
    useAccessReviewMock.mockReturnValue([true, true]);
    k8sListResourceMock.mockResolvedValue(mockInferenceServicesList);

    testHook(useInferenceServices)(undefined, 'some-registered-model-id', 'some-model-version-id');

    expect(k8sListResourceMock.mock.calls[0][0].queryOptions?.queryParams).toEqual({
      labelSelector:
        'modelregistry.opendatahub.io/registered-model-id=some-registered-model-id,modelregistry.opendatahub.io/model-version-id=some-model-version-id',
    });
  });

  it('should return inference services of model registry, when modelRegistry name is present', async () => {
    // Mock the return value of useModelServingEnabled
    useModelServingEnabledMock.mockReturnValue(true);
    // Mock the return value of useAccessReview
    useAccessReviewMock.mockReturnValue([true, true]);

    k8sListResourceMock.mockResolvedValue(mockInferenceServicesList);
    const renderResult = testHook(useInferenceServices)('namespace', '1', '2', 'test-registry');
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: { hasNonDashboardItems: false, items: [] } }),
    );
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: { hasNonDashboardItems: false, items: mockInferenceServicesList.items.slice(0, 3) },
        loaded: true,
      }),
    );

    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable({ data: false, loaded: false, error: true, refresh: true });

    // refresh
    k8sListResourceMock.mockResolvedValue(
      mockK8sResourceList([...mockInferenceServicesList.items]),
    );
    await act(() => renderResult.result.current.refresh());
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: { hasNonDashboardItems: false, items: mockInferenceServicesList.items.slice(0, 3) },
        loaded: true,
      }),
    );
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable({ data: false, loaded: true, error: true, refresh: true });
  });

  it('should exclude non-dashboard inference services when they are present and include hasNonDashboardItems: true', async () => {
    useModelServingEnabledMock.mockReturnValue(true);
    useAccessReviewMock.mockReturnValue([true, true]);
    k8sListResourceMock.mockResolvedValue(mockInferenceServicesListWithNonDashboardItems);

    const renderResult = testHook(useInferenceServices)('namespace');
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: { hasNonDashboardItems: false, items: [] } }),
    );
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: { hasNonDashboardItems: true, items: mockInferenceServicesList.items },
        loaded: true,
      }),
    );
  });
});
