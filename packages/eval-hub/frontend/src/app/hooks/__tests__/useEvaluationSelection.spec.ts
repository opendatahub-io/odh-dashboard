/* eslint-disable camelcase */
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useEvaluationSelection } from '~/app/hooks/useEvaluationSelection';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import type { Collection, FlatBenchmark } from '~/app/types';

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
  useSearchParams: jest.fn(),
  useLocation: jest.fn(),
}));

jest.mock('~/app/routes', () => ({
  evaluationCreateRoute: (ns?: string) => `/${ns}/create`,
}));

const mockNavigate = jest.fn();

const setupSearchParams = (params: Record<string, string>) => {
  const sp = new URLSearchParams(params);
  jest.mocked(useSearchParams).mockReturnValue([sp, jest.fn()]);
};

const mockUseLocation = useLocation as jest.Mock;

const setupLocationState = (state: Record<string, unknown> | null) => {
  mockUseLocation.mockReturnValue({
    pathname: '/test-ns/create/start',
    search: '',
    hash: '',
    state,
    key: 'default',
  });
};

const mockBenchmark: FlatBenchmark = {
  id: 'arc_easy',
  name: 'ARC Easy',
  providerId: 'prov-1',
  providerName: 'Provider 1',
  primary_score: { metric: 'accuracy', lower_is_better: false },
};

const mockCollection: Collection = {
  resource: { id: 'col-1' },
  name: 'My Collection',
  benchmarks: [{ id: 'mmlu', provider_id: 'lm_harness' }],
};

describe('useEvaluationSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useNavigate).mockReturnValue(mockNavigate);
    setupLocationState(null);
  });

  describe('benchmark flow', () => {
    it('should return benchmark from location state', () => {
      setupSearchParams({ type: 'benchmark', providerId: 'prov-1', benchmarkId: 'arc_easy' });
      setupLocationState({ benchmark: mockBenchmark });

      const renderResult = testHook(useEvaluationSelection)('test-ns');

      expect(renderResult.result.current.benchmark).toEqual(mockBenchmark);
      expect(renderResult.result.current.collection).toBeUndefined();
      expect(renderResult.result.current.isCollectionFlow).toBe(false);
      expect(renderResult.result.current.dataLoaded).toBe(true);
      expect(renderResult.result.current.loadError).toBeUndefined();
    });

    it('should return undefined benchmark when location state has no benchmark', () => {
      setupSearchParams({ type: 'benchmark', providerId: 'prov-1', benchmarkId: 'arc_easy' });
      setupLocationState(null);

      const renderResult = testHook(useEvaluationSelection)('test-ns');

      expect(renderResult.result.current.benchmark).toBeUndefined();
      expect(renderResult.result.current.dataLoaded).toBe(true);
    });

    it('should not return collection data in benchmark flow', () => {
      setupSearchParams({ type: 'benchmark', providerId: 'prov-1', benchmarkId: 'arc_easy' });
      setupLocationState({ benchmark: mockBenchmark, collection: mockCollection });

      const renderResult = testHook(useEvaluationSelection)('test-ns');

      expect(renderResult.result.current.benchmark).toEqual(mockBenchmark);
      expect(renderResult.result.current.collection).toBeUndefined();
    });
  });

  describe('collection flow', () => {
    it('should return collection from location state', () => {
      setupSearchParams({ type: 'collection', collectionId: 'col-1' });
      setupLocationState({ collection: mockCollection });

      const renderResult = testHook(useEvaluationSelection)('test-ns');

      expect(renderResult.result.current.collection).toEqual(mockCollection);
      expect(renderResult.result.current.benchmark).toBeUndefined();
      expect(renderResult.result.current.isCollectionFlow).toBe(true);
      expect(renderResult.result.current.dataLoaded).toBe(true);
      expect(renderResult.result.current.loadError).toBeUndefined();
    });

    it('should return undefined collection when location state has no collection', () => {
      setupSearchParams({ type: 'collection', collectionId: 'col-1' });
      setupLocationState(null);

      const renderResult = testHook(useEvaluationSelection)('test-ns');

      expect(renderResult.result.current.collection).toBeUndefined();
      expect(renderResult.result.current.dataLoaded).toBe(true);
    });

    it('should not return benchmark data in collection flow', () => {
      setupSearchParams({ type: 'collection', collectionId: 'col-1' });
      setupLocationState({ benchmark: mockBenchmark, collection: mockCollection });

      const renderResult = testHook(useEvaluationSelection)('test-ns');

      expect(renderResult.result.current.collection).toEqual(mockCollection);
      expect(renderResult.result.current.benchmark).toBeUndefined();
    });
  });

  describe('redirects', () => {
    it('should redirect to create page when no valid flow type is present', () => {
      setupSearchParams({});

      testHook(useEvaluationSelection)('test-ns');

      expect(mockNavigate).toHaveBeenCalledWith('/test-ns/create', { replace: true });
    });

    it('should not redirect when benchmark flow is active', () => {
      setupSearchParams({ type: 'benchmark', providerId: 'prov-1', benchmarkId: 'arc_easy' });

      testHook(useEvaluationSelection)('test-ns');

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not redirect when collection flow is active', () => {
      setupSearchParams({ type: 'collection', collectionId: 'col-1' });

      testHook(useEvaluationSelection)('test-ns');

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('dataLoaded and loadError', () => {
    it('should always be true / undefined regardless of flow', () => {
      setupSearchParams({});

      const renderResult = testHook(useEvaluationSelection)('test-ns');

      expect(renderResult.result.current.dataLoaded).toBe(true);
      expect(renderResult.result.current.loadError).toBeUndefined();
    });
  });
});
