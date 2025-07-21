/* eslint-disable camelcase */
import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { testHook } from '#~/__tests__/unit/testUtils/hooks';
import { useFeatureStoreCR } from '#~/pages/featureStore/apiHooks/useFeatureStoreCR.tsx';
import { mockFeatureStore } from '#~/__mocks__/mockFeatureStore.ts';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { FeatureStoreKind } from '#~/k8sTypes';
import { FeatureStoreModel } from '#~/api/models/odh.ts';
import {
  FEATURE_STORE_UI_LABEL_KEY,
  FEATURE_STORE_UI_LABEL_VALUE,
} from '#~/pages/featureStore/const.ts';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
}));

const k8sListResourceMock = jest.mocked(k8sListResource<FeatureStoreKind>);

describe('useFeatureStoreCR', () => {
  const mockFeatureStoreCR = mockFeatureStore();
  const mockFeatureStoreCRWithLabel = {
    ...mockFeatureStoreCR,
    metadata: {
      ...mockFeatureStoreCR.metadata,
      labels: {
        [FEATURE_STORE_UI_LABEL_KEY]: FEATURE_STORE_UI_LABEL_VALUE,
      },
    },
  };

  const mockFeatureStoreCRWithoutLabel = {
    ...mockFeatureStoreCR,
    metadata: {
      ...mockFeatureStoreCR.metadata,
      name: 'no-label-cr',
      labels: {
        'other-label': 'other-value',
      },
    },
  };

  const mockFeatureStoreCRWithWrongLabel = {
    ...mockFeatureStoreCR,
    metadata: {
      ...mockFeatureStoreCR.metadata,
      name: 'wrong-label-cr',
      labels: {
        [FEATURE_STORE_UI_LABEL_KEY]: 'wrong-value',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return successful feature store CR when CR with correct label exists', async () => {
    k8sListResourceMock.mockResolvedValue(
      mockK8sResourceList([mockFeatureStoreCRWithLabel, mockFeatureStoreCRWithoutLabel]),
    );

    const renderResult = testHook(useFeatureStoreCR)();

    expect(renderResult.result.current.featureStoreCR).toBe(null);
    expect(renderResult.result.current.isLoaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.featureStoreCR).toEqual(mockFeatureStoreCRWithLabel);
    expect(renderResult.result.current.isLoaded).toBe(true);
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

  it('should return null when no CRs match the label filter', async () => {
    k8sListResourceMock.mockResolvedValue(
      mockK8sResourceList([mockFeatureStoreCRWithoutLabel, mockFeatureStoreCRWithWrongLabel]),
    );

    const renderResult = testHook(useFeatureStoreCR)();

    expect(renderResult.result.current.featureStoreCR).toBe(null);
    expect(renderResult.result.current.isLoaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.featureStoreCR).toBe(null);
    expect(renderResult.result.current.isLoaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
  });

  it('should return null when no CRs exist', async () => {
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([]));

    const renderResult = testHook(useFeatureStoreCR)();

    expect(renderResult.result.current.featureStoreCR).toBe(null);
    expect(renderResult.result.current.isLoaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.featureStoreCR).toBe(null);
    expect(renderResult.result.current.isLoaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
  });

  it('should handle errors when API call fails', async () => {
    const testError = new Error('Failed to fetch feature store CRs');
    k8sListResourceMock.mockRejectedValue(testError);

    const renderResult = testHook(useFeatureStoreCR)();

    expect(renderResult.result.current.featureStoreCR).toBe(null);
    expect(renderResult.result.current.isLoaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.featureStoreCR).toBe(null);
    expect(renderResult.result.current.isLoaded).toBe(false);
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

    expect(renderResult.result.current.featureStoreCR).toEqual(mockFeatureStoreCRWithLabel);
    expect(renderResult.result.current.isLoaded).toBe(true);
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
      featureStoreCR: false,
      isLoaded: true,
      error: true,
    });
  });

  it('should handle undefined labels in CR metadata', async () => {
    const crWithUndefinedLabels = {
      ...mockFeatureStoreCR,
      metadata: {
        ...mockFeatureStoreCR.metadata,
        name: 'undefined-labels-cr',
        labels: undefined,
      },
    };

    k8sListResourceMock.mockResolvedValue(
      mockK8sResourceList([crWithUndefinedLabels, mockFeatureStoreCRWithLabel]),
    );

    const renderResult = testHook(useFeatureStoreCR)();

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.featureStoreCR).toEqual(mockFeatureStoreCRWithLabel);
    expect(renderResult).hookToHaveUpdateCount(2);
  });
});
