import { useLocation } from 'react-router';
import { testHook } from '#~/__tests__/unit/testUtils/hooks';
import { FeatureStoreObject } from '#~/pages/featureStore/const';
import {
  getFeatureStoreObjectFromPath,
  useFeatureStoreObject,
} from '#~/pages/featureStore/apiHooks/useFeatureStoreObject.tsx';

jest.mock('react-router', () => ({
  useLocation: jest.fn(),
}));

const useLocationMock = jest.mocked(useLocation);

describe('getFeatureStoreObjectFromPath', () => {
  it('should extract entities from pathname', () => {
    const pathname = '/featureStore/entities/project1';
    const result = getFeatureStoreObjectFromPath(pathname);
    expect(result).toBe(FeatureStoreObject.ENTITIES);
  });

  it('should return default (ENTITIES) when pathname has no feature store object', () => {
    const pathname = '/featureStore/';
    const result = getFeatureStoreObjectFromPath(pathname);
    expect(result).toBe(FeatureStoreObject.ENTITIES);
  });

  it('should handle deep nested pathname', () => {
    const pathname = '/featureStore/featureViews/project1/view/details/metadata';
    const result = getFeatureStoreObjectFromPath(pathname);
    expect(result).toBe(FeatureStoreObject.FEATURE_VIEWS);
  });
});

describe('useFeatureStoreObject', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return entities when location pathname contains entities', () => {
    useLocationMock.mockReturnValue({
      pathname: '/featureStore/entities/project1',
      search: '',
      hash: '',
      state: null,
      key: 'test',
    });

    const renderResult = testHook(useFeatureStoreObject)();

    expect(renderResult.result.current).toBe(FeatureStoreObject.ENTITIES);
    expect(useLocationMock).toHaveBeenCalledTimes(1);
  });

  it('should return default (ENTITIES) when pathname has no feature store object', () => {
    useLocationMock.mockReturnValue({
      pathname: '/featureStore/',
      search: '',
      hash: '',
      state: null,
      key: 'test',
    });

    const renderResult = testHook(useFeatureStoreObject)();

    expect(renderResult.result.current).toBe(FeatureStoreObject.ENTITIES);
    expect(useLocationMock).toHaveBeenCalledTimes(1);
  });

  it('should update when location changes', () => {
    useLocationMock.mockReturnValue({
      pathname: '/featureStore/entities/project1',
      search: '',
      hash: '',
      state: null,
      key: 'test',
    });

    const renderResult = testHook(useFeatureStoreObject)();

    expect(renderResult.result.current).toBe(FeatureStoreObject.ENTITIES);

    // Change location
    useLocationMock.mockReturnValue({
      pathname: '/featureStore/featureViews/project1',
      search: '',
      hash: '',
      state: null,
      key: 'test2',
    });

    renderResult.rerender();

    expect(renderResult.result.current).toBe(FeatureStoreObject.FEATURE_VIEWS);
    expect(useLocationMock).toHaveBeenCalledTimes(2);
  });

  it('should be stable when location pathname stays the same', () => {
    const location = {
      pathname: '/featureStore/entities/project1',
      search: '',
      hash: '',
      state: null,
      key: 'test',
    };

    useLocationMock.mockReturnValue(location);

    const renderResult = testHook(useFeatureStoreObject)();
    const firstResult = renderResult.result.current;

    renderResult.rerender();
    const secondResult = renderResult.result.current;

    expect(firstResult).toBe(secondResult);
    expect(firstResult).toBe(FeatureStoreObject.ENTITIES);
    expect(useLocationMock).toHaveBeenCalledTimes(2);
  });
});
