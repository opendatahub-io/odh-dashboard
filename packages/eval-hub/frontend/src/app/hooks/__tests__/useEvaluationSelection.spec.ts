/* eslint-disable camelcase */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEvaluationSelection } from '~/app/hooks/useEvaluationSelection';
import { useProviders } from '~/app/hooks/useProviders';
import { useCollections } from '~/app/hooks/useCollections';
import { useNotification } from '~/app/hooks/useNotification';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import type { Collection, Provider } from '~/app/types';

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('~/app/hooks/useProviders', () => ({
  useProviders: jest.fn(),
}));

jest.mock('~/app/hooks/useCollections', () => ({
  useCollections: jest.fn(),
}));

jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: jest.fn(),
}));

jest.mock('~/app/routes', () => ({
  evaluationBenchmarksRoute: (ns?: string) => `/${ns}/create/benchmarks`,
  evaluationCollectionsRoute: (ns?: string) => `/${ns}/create/collections`,
  evaluationCreateRoute: (ns?: string) => `/${ns}/create`,
}));

const mockNavigate = jest.fn();
const mockNotification = {
  warning: jest.fn(),
  error: jest.fn(),
  success: jest.fn(),
  info: jest.fn(),
  remove: jest.fn(),
};

const mockUseProviders = jest.mocked(useProviders);
const mockUseCollections = jest.mocked(useCollections);

const setupSearchParams = (params: Record<string, string>) => {
  const sp = new URLSearchParams(params);
  jest.mocked(useSearchParams).mockReturnValue([sp, jest.fn()]);
};

describe('useEvaluationSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useNavigate).mockReturnValue(mockNavigate);
    jest.mocked(useNotification).mockReturnValue(mockNotification);
    mockUseProviders.mockReturnValue({ providers: [], loaded: false, loadError: undefined });
    mockUseCollections.mockReturnValue({ collections: [], loaded: false, loadError: undefined });
  });

  describe('benchmark flow', () => {
    const provider: Provider = {
      resource: { id: 'prov-1' },
      name: 'LM Harness',
      benchmarks: [
        {
          id: 'arc_easy',
          name: 'ARC Easy',
          primary_score: { metric: 'accuracy', lower_is_better: false },
        },
      ],
    };

    it('should return the matching benchmark when providers are loaded', () => {
      setupSearchParams({ type: 'benchmark', providerId: 'prov-1', benchmarkId: 'arc_easy' });
      mockUseProviders.mockReturnValue({
        providers: [provider],
        loaded: true,
        loadError: undefined,
      });

      const renderResult = testHook(useEvaluationSelection)('test-ns');

      expect(renderResult.result.current.benchmark).toEqual(
        expect.objectContaining({ id: 'arc_easy', providerId: 'prov-1' }),
      );
      expect(renderResult.result.current.dataLoaded).toBe(true);
      expect(renderResult.result.current.isCollectionFlow).toBe(false);
    });

    it('should return undefined benchmark while loading', () => {
      setupSearchParams({ type: 'benchmark', providerId: 'prov-1', benchmarkId: 'arc_easy' });
      mockUseProviders.mockReturnValue({ providers: [], loaded: false, loadError: undefined });

      const renderResult = testHook(useEvaluationSelection)('test-ns');

      expect(renderResult.result.current.benchmark).toBeUndefined();
      expect(renderResult.result.current.dataLoaded).toBe(false);
    });

    it('should return undefined benchmark when provider is not found', () => {
      setupSearchParams({ type: 'benchmark', providerId: 'nonexistent', benchmarkId: 'arc_easy' });
      mockUseProviders.mockReturnValue({
        providers: [provider],
        loaded: true,
        loadError: undefined,
      });

      const renderResult = testHook(useEvaluationSelection)('test-ns');

      expect(renderResult.result.current.benchmark).toBeUndefined();
    });

    it('should return undefined benchmark when benchmarkId is not found in provider', () => {
      setupSearchParams({ type: 'benchmark', providerId: 'prov-1', benchmarkId: 'nonexistent' });
      mockUseProviders.mockReturnValue({
        providers: [provider],
        loaded: true,
        loadError: undefined,
      });

      const renderResult = testHook(useEvaluationSelection)('test-ns');

      expect(renderResult.result.current.benchmark).toBeUndefined();
    });
  });

  describe('collection flow', () => {
    const collection: Collection = {
      resource: { id: 'col-1' },
      name: 'My Collection',
      benchmarks: [{ id: 'mmlu', provider_id: 'lm_harness' }],
    };

    it('should return the matching collection when collections are loaded', () => {
      setupSearchParams({ type: 'collection', collectionId: 'col-1' });
      mockUseCollections.mockReturnValue({
        collections: [collection],
        loaded: true,
        loadError: undefined,
      });

      const renderResult = testHook(useEvaluationSelection)('test-ns');

      expect(renderResult.result.current.collection).toEqual(collection);
      expect(renderResult.result.current.dataLoaded).toBe(true);
      expect(renderResult.result.current.isCollectionFlow).toBe(true);
    });

    it('should return undefined collection when collectionId is not found', () => {
      setupSearchParams({ type: 'collection', collectionId: 'nonexistent' });
      mockUseCollections.mockReturnValue({
        collections: [collection],
        loaded: true,
        loadError: undefined,
      });

      const renderResult = testHook(useEvaluationSelection)('test-ns');

      expect(renderResult.result.current.collection).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should set dataLoaded to true and return loadError when providers fail', () => {
      setupSearchParams({ type: 'benchmark', providerId: 'prov-1', benchmarkId: 'arc_easy' });
      const error = new Error('providers fetch failed');
      mockUseProviders.mockReturnValue({ providers: [], loaded: false, loadError: error });

      const renderResult = testHook(useEvaluationSelection)('test-ns');

      expect(renderResult.result.current.dataLoaded).toBe(true);
      expect(renderResult.result.current.loadError).toBe(error);
    });

    it('should set dataLoaded to true and return loadError when collections fail', () => {
      setupSearchParams({ type: 'collection', collectionId: 'col-1' });
      const error = new Error('collections fetch failed');
      mockUseCollections.mockReturnValue({ collections: [], loaded: false, loadError: error });

      const renderResult = testHook(useEvaluationSelection)('test-ns');

      expect(renderResult.result.current.dataLoaded).toBe(true);
      expect(renderResult.result.current.loadError).toBe(error);
    });

    it('should not redirect when there is a loadError', () => {
      setupSearchParams({ type: 'collection', collectionId: 'col-1' });
      mockUseCollections.mockReturnValue({
        collections: [],
        loaded: false,
        loadError: new Error('failed'),
      });

      testHook(useEvaluationSelection)('test-ns');

      expect(mockNotification.warning).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('redirects', () => {
    it('should redirect to create page when no valid flow type is present', () => {
      setupSearchParams({});

      testHook(useEvaluationSelection)('test-ns');

      expect(mockNavigate).toHaveBeenCalledWith('/test-ns/create', { replace: true });
    });

    it('should redirect and warn when loaded but selection not found in benchmark flow', () => {
      setupSearchParams({ type: 'benchmark', providerId: 'prov-1', benchmarkId: 'missing' });
      mockUseProviders.mockReturnValue({ providers: [], loaded: true, loadError: undefined });

      testHook(useEvaluationSelection)('test-ns');

      expect(mockNotification.warning).toHaveBeenCalledWith(
        'Selection not found',
        expect.any(String),
      );
      expect(mockNavigate).toHaveBeenCalledWith('/test-ns/create/benchmarks', { replace: true });
    });

    it('should redirect and warn when loaded but selection not found in collection flow', () => {
      setupSearchParams({ type: 'collection', collectionId: 'missing' });
      mockUseCollections.mockReturnValue({ collections: [], loaded: true, loadError: undefined });

      testHook(useEvaluationSelection)('test-ns');

      expect(mockNotification.warning).toHaveBeenCalledWith(
        'Selection not found',
        expect.any(String),
      );
      expect(mockNavigate).toHaveBeenCalledWith('/test-ns/create/collections', { replace: true });
    });
  });

  describe('dataLoaded', () => {
    it('should be true when neither benchmark nor collection flow', () => {
      setupSearchParams({});

      const renderResult = testHook(useEvaluationSelection)('test-ns');

      expect(renderResult.result.current.dataLoaded).toBe(true);
    });

    it('should return no loadError when neither flow is active', () => {
      setupSearchParams({});

      const renderResult = testHook(useEvaluationSelection)('test-ns');

      expect(renderResult.result.current.loadError).toBeUndefined();
    });
  });
});
