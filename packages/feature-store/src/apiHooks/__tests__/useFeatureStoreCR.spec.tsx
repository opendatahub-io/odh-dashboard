/* eslint-disable camelcase */
import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import { FeatureStoreKind } from '@odh-dashboard/internal/k8sTypes';
import { FeatureStoreModel } from '@odh-dashboard/internal/api/models/odh';
import { mockFeatureStore } from '../../__mocks__/mockFeatureStore';
import { FEATURE_STORE_UI_LABEL_KEY, FEATURE_STORE_UI_LABEL_VALUE } from '../../const';
import { useFeatureStoreCR } from '../useFeatureStoreCR';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
}));

const k8sListResourceMock = jest.mocked(k8sListResource<FeatureStoreKind>);

describe('useFeatureStoreCR', () => {
  const mockFeatureStoreCR = mockFeatureStore({
    name: 'demo',
    namespace: 'default',
  });
  const mockFeatureStoreCRWithLabel = {
    ...mockFeatureStoreCR,
    metadata: {
      ...mockFeatureStoreCR.metadata,
      labels: {
        [FEATURE_STORE_UI_LABEL_KEY]: FEATURE_STORE_UI_LABEL_VALUE,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return successful feature store CR when CR with correct label exists', async () => {
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([mockFeatureStoreCRWithLabel]));

    const renderResult = testHook(useFeatureStoreCR)();

    expect(renderResult.result.current.data).toBe(null);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(mockFeatureStoreCRWithLabel);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: FeatureStoreModel,
      queryOptions: {
        queryParams: {
          labelSelector: `${FEATURE_STORE_UI_LABEL_KEY}=${FEATURE_STORE_UI_LABEL_VALUE}`,
        },
      },
    });
  });

  it('should return null when no CRs exist', async () => {
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([]));

    const renderResult = testHook(useFeatureStoreCR)();

    expect(renderResult.result.current.data).toBe(null);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toBe(null);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
  });

  it('should handle errors when API call fails', async () => {
    const testError = new Error('Failed to fetch feature store CRs');
    k8sListResourceMock.mockRejectedValue(testError);

    const renderResult = testHook(useFeatureStoreCR)();

    expect(renderResult.result.current.data).toBe(null);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toBe(null);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toEqual(testError);
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
  });

  it('should return first matching CR when multiple CRs have correct labels', async () => {
    const secondFeatureStoreCR = {
      ...mockFeatureStoreCRWithLabel,
      metadata: {
        ...mockFeatureStoreCRWithLabel.metadata,
        name: 'second-cr',
        uid: 'second-uid',
      },
    };

    k8sListResourceMock.mockResolvedValue(
      mockK8sResourceList([mockFeatureStoreCRWithLabel, secondFeatureStoreCR]),
    );

    const renderResult = testHook(useFeatureStoreCR)();

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(mockFeatureStoreCRWithLabel);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should be stable when re-rendered with same parameters', async () => {
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([mockFeatureStoreCRWithLabel]));

    const renderResult = testHook(useFeatureStoreCR)();

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToHaveUpdateCount(2);

    renderResult.rerender();
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable({
      data: false,
      loaded: true,
      error: true,
    });
  });
});
