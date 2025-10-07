import { useLocation } from 'react-router';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { FeatureStoreObject } from '../../const';
import { getFeatureStoreObjectFromPath, useFeatureStoreObject } from '../useFeatureStoreObject';

jest.mock('react-router', () => ({
  useLocation: jest.fn(),
}));

const useLocationMock = jest.mocked(useLocation);

describe('getFeatureStoreObjectFromPath', () => {
  it('should extract entities from pathname', () => {
    const pathname = '/develop-train/feature-store/entities/project1';
    const result = getFeatureStoreObjectFromPath(pathname);
    expect(result).toBe(FeatureStoreObject.ENTITIES);
  });

  it('should return default (ENTITIES) when pathname has no feature store object', () => {
    const pathname = '/develop-train/feature-store/';
    const result = getFeatureStoreObjectFromPath(pathname);
    expect(result).toBe(FeatureStoreObject.ENTITIES);
  });

  it('should handle deep nested pathname', () => {
    const pathname = '/develop-train/feature-store/feature-views/project1/view/details/metadata';
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
      pathname: '/develop-train/feature-store/entities/project1',
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
      pathname: '/develop-train/feature-store/',
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
      pathname: '/develop-train/feature-store/entities/project1',
      search: '',
      hash: '',
      state: null,
      key: 'test',
    });

    const renderResult = testHook(useFeatureStoreObject)();

    expect(renderResult.result.current).toBe(FeatureStoreObject.ENTITIES);

    // Change location
    useLocationMock.mockReturnValue({
      pathname: '/develop-train/feature-store/feature-views/project1',
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
      pathname: '/develop-train/feature-store/entities/project1',
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
