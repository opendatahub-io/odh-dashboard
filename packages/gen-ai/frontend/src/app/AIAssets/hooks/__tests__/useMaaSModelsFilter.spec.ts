/* eslint-disable camelcase */
import { act } from '@testing-library/react';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import useMaaSModelsFilter from '~/app/AIAssets/hooks/useMaaSModelsFilter';
import { AssetsFilterOptions } from '~/app/AIAssets/data/filterOptions';
import type { MaaSModel } from '~/app/types';

const createMockMaaSModel = (overrides?: Partial<MaaSModel>): MaaSModel => ({
  id: 'test-maas-model',
  object: 'model',
  created: Date.now(),
  owned_by: 'test-org',
  ready: true,
  url: 'https://example.com/model',
  ...overrides,
});

describe('useMaaSModelsFilter', () => {
  describe('Initial state', () => {
    it('should initialize with empty filter data', () => {
      const models: MaaSModel[] = [];
      const { result } = testHook(useMaaSModelsFilter)(models);

      expect(result.current.filterData).toEqual({
        [AssetsFilterOptions.NAME]: undefined,
        [AssetsFilterOptions.KEYWORD]: undefined,
      });
    });

    it('should return all models when no filters are applied', () => {
      const models = [
        createMockMaaSModel({ id: 'model-1' }),
        createMockMaaSModel({ id: 'model-2' }),
      ];

      const { result } = testHook(useMaaSModelsFilter)(models);

      expect(result.current.filteredModels).toEqual(models);
    });

    it('should return functions for filter operations', () => {
      const models: MaaSModel[] = [];
      const { result } = testHook(useMaaSModelsFilter)(models);

      expect(typeof result.current.onFilterUpdate).toBe('function');
      expect(typeof result.current.onClearFilters).toBe('function');
    });
  });

  describe('Filter by name', () => {
    it('should filter models by id (case insensitive)', () => {
      const models = [
        createMockMaaSModel({ id: 'bert-model' }),
        createMockMaaSModel({ id: 'gpt-model' }),
        createMockMaaSModel({ id: 'llama-model' }),
      ];

      const { result } = testHook(useMaaSModelsFilter)(models);

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.NAME, 'gpt');
      });

      expect(result.current.filteredModels).toHaveLength(1);
      expect(result.current.filteredModels[0].id).toBe('gpt-model');
    });

    it('should filter models by partial id match', () => {
      const models = [
        createMockMaaSModel({ id: 'bert-base-model' }),
        createMockMaaSModel({ id: 'bert-large-model' }),
        createMockMaaSModel({ id: 'gpt-model' }),
      ];

      const { result } = testHook(useMaaSModelsFilter)(models);

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.NAME, 'bert');
      });

      expect(result.current.filteredModels).toHaveLength(2);
      expect(result.current.filteredModels[0].id).toBe('bert-base-model');
      expect(result.current.filteredModels[1].id).toBe('bert-large-model');
    });

    it('should handle uppercase filter values', () => {
      const models = [createMockMaaSModel({ id: 'bert-model' })];

      const { result } = testHook(useMaaSModelsFilter)(models);

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.NAME, 'BERT');
      });

      expect(result.current.filteredModels).toHaveLength(1);
    });
  });

  describe('Filter by keyword', () => {
    it('should filter models by keyword in id', () => {
      const models = [
        createMockMaaSModel({
          id: 'bert-model',
          url: 'https://example.com/bert',
          owned_by: 'openai',
        }),
        createMockMaaSModel({
          id: 'gpt-model',
          url: 'https://example.com/gpt',
          owned_by: 'anthropic',
        }),
      ];

      const { result } = testHook(useMaaSModelsFilter)(models);

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.KEYWORD, 'bert');
      });

      expect(result.current.filteredModels).toHaveLength(1);
      expect(result.current.filteredModels[0].id).toBe('bert-model');
    });

    it('should filter models by keyword in url', () => {
      const models = [
        createMockMaaSModel({
          id: 'model-1',
          url: 'https://api.openai.com/v1/models',
          owned_by: 'org',
        }),
        createMockMaaSModel({
          id: 'model-2',
          url: 'https://api.anthropic.com/v1/models',
          owned_by: 'org',
        }),
      ];

      const { result } = testHook(useMaaSModelsFilter)(models);

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.KEYWORD, 'openai');
      });

      expect(result.current.filteredModels).toHaveLength(1);
      expect(result.current.filteredModels[0].id).toBe('model-1');
    });

    it('should filter models by keyword in owned_by', () => {
      const models = [
        createMockMaaSModel({
          id: 'model-1',
          url: 'https://example.com/model-1',
          owned_by: 'openai',
        }),
        createMockMaaSModel({
          id: 'model-2',
          url: 'https://example.com/model-2',
          owned_by: 'anthropic',
        }),
      ];

      const { result } = testHook(useMaaSModelsFilter)(models);

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.KEYWORD, 'anthropic');
      });

      expect(result.current.filteredModels).toHaveLength(1);
      expect(result.current.filteredModels[0].id).toBe('model-2');
    });

    it('should search across all fields (id, url, owned_by)', () => {
      const models = [
        createMockMaaSModel({
          id: 'bert-classifier',
          url: 'https://api.example.com/bert',
          owned_by: 'openai',
        }),
        createMockMaaSModel({
          id: 'gpt-generator',
          url: 'https://api.example.com/gpt',
          owned_by: 'anthropic',
        }),
      ];

      const { result } = testHook(useMaaSModelsFilter)(models);

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.KEYWORD, 'generator');
      });

      expect(result.current.filteredModels).toHaveLength(1);
      expect(result.current.filteredModels[0].id).toBe('gpt-generator');
    });

    it('should be case insensitive for keyword search', () => {
      const models = [
        createMockMaaSModel({
          id: 'model-1',
          url: 'https://example.com',
          owned_by: 'OpenAI',
        }),
      ];

      const { result } = testHook(useMaaSModelsFilter)(models);

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.KEYWORD, 'openai');
      });

      expect(result.current.filteredModels).toHaveLength(1);
    });
  });

  describe('Multiple filters', () => {
    it('should apply multiple filters (AND logic)', () => {
      const models = [
        createMockMaaSModel({
          id: 'bert-model',
          url: 'https://api.openai.com/bert',
          owned_by: 'openai',
        }),
        createMockMaaSModel({
          id: 'bert-classifier',
          url: 'https://api.anthropic.com/bert',
          owned_by: 'anthropic',
        }),
        createMockMaaSModel({
          id: 'gpt-model',
          url: 'https://api.openai.com/gpt',
          owned_by: 'openai',
        }),
      ];

      const { result } = testHook(useMaaSModelsFilter)(models);

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.NAME, 'bert');
      });

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.KEYWORD, 'openai');
      });

      expect(result.current.filteredModels).toHaveLength(1);
      expect(result.current.filteredModels[0].id).toBe('bert-model');
    });

    it('should return empty array when filters match no models', () => {
      const models = [createMockMaaSModel({ id: 'bert-model' })];

      const { result } = testHook(useMaaSModelsFilter)(models);

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.NAME, 'nonexistent');
      });

      expect(result.current.filteredModels).toHaveLength(0);
    });
  });

  describe('Clear filters', () => {
    it('should clear all filters', () => {
      const models = [
        createMockMaaSModel({ id: 'bert-model', owned_by: 'openai' }),
        createMockMaaSModel({ id: 'gpt-model' }),
      ];

      const { result } = testHook(useMaaSModelsFilter)(models);

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.NAME, 'bert');
        result.current.onFilterUpdate(AssetsFilterOptions.KEYWORD, 'openai');
      });

      expect(result.current.filteredModels).toHaveLength(1);

      act(() => {
        result.current.onClearFilters();
      });

      expect(result.current.filterData).toEqual({
        [AssetsFilterOptions.NAME]: undefined,
        [AssetsFilterOptions.KEYWORD]: undefined,
      });
      expect(result.current.filteredModels).toEqual(models);
    });
  });

  describe('Filter updates', () => {
    it('should update filter data when filter is changed', () => {
      const models: MaaSModel[] = [];
      const { result } = testHook(useMaaSModelsFilter)(models);

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.NAME, 'test');
      });

      expect(result.current.filterData[AssetsFilterOptions.NAME]).toBe('test');
    });

    it('should preserve other filters when updating one filter', () => {
      const models: MaaSModel[] = [];
      const { result } = testHook(useMaaSModelsFilter)(models);

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.NAME, 'name-filter');
        result.current.onFilterUpdate(AssetsFilterOptions.KEYWORD, 'keyword-filter');
      });

      expect(result.current.filterData[AssetsFilterOptions.NAME]).toBe('name-filter');
      expect(result.current.filterData[AssetsFilterOptions.KEYWORD]).toBe('keyword-filter');

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.NAME, 'updated-name');
      });

      expect(result.current.filterData[AssetsFilterOptions.NAME]).toBe('updated-name');
      expect(result.current.filterData[AssetsFilterOptions.KEYWORD]).toBe('keyword-filter');
    });
  });
});
