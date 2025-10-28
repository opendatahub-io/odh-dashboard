/* eslint-disable camelcase */
import { act } from '@testing-library/react';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import useAIModelsFilter from '~/app/AIAssets/hooks/useAIModelsFilter';
import { AssetsFilterOptions } from '~/app/AIAssets/data/filterOptions';
import type { AIModel } from '~/app/types';

const createMockAIModel = (overrides?: Partial<AIModel>): AIModel => ({
  model_name: 'test-model',
  model_id: 'test-model-id',
  serving_runtime: 'kserve',
  api_protocol: 'v2',
  version: 'v1',
  usecase: 'llm',
  description: 'Test model description',
  endpoints: [],
  status: 'Running',
  display_name: 'Test Model',
  sa_token: {
    name: 'token-name',
    token_name: 'token',
    token: 'test-token',
  },
  ...overrides,
});

describe('useAIModelsFilter', () => {
  describe('Initial state', () => {
    it('should initialize with empty filter data', () => {
      const models: AIModel[] = [];
      const { result } = testHook(useAIModelsFilter)(models);

      expect(result.current.filterData).toEqual({
        [AssetsFilterOptions.NAME]: undefined,
        [AssetsFilterOptions.KEYWORD]: undefined,
        [AssetsFilterOptions.USE_CASE]: undefined,
      });
    });

    it('should return all models when no filters are applied', () => {
      const models = [
        createMockAIModel({ model_id: 'model-1' }),
        createMockAIModel({ model_id: 'model-2' }),
      ];

      const { result } = testHook(useAIModelsFilter)(models);

      expect(result.current.filteredModels).toEqual(models);
    });
  });

  describe('Filter by name', () => {
    it('should filter models by name (case insensitive)', () => {
      const models = [
        createMockAIModel({ model_id: 'model-1', model_name: 'bert-model' }),
        createMockAIModel({ model_id: 'model-2', model_name: 'gpt-model' }),
        createMockAIModel({ model_id: 'model-3', model_name: 'llama-model' }),
      ];

      const { result } = testHook(useAIModelsFilter)(models);

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.NAME, 'gpt');
      });

      expect(result.current.filteredModels).toHaveLength(1);
      expect(result.current.filteredModels[0].model_id).toBe('model-2');
    });

    it('should filter models by partial name match', () => {
      const models = [
        createMockAIModel({ model_id: 'model-1', model_name: 'bert-base-model' }),
        createMockAIModel({ model_id: 'model-2', model_name: 'bert-large-model' }),
        createMockAIModel({ model_id: 'model-3', model_name: 'gpt-model' }),
      ];

      const { result } = testHook(useAIModelsFilter)(models);

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.NAME, 'bert');
      });

      expect(result.current.filteredModels).toHaveLength(2);
      expect(result.current.filteredModels[0].model_id).toBe('model-1');
      expect(result.current.filteredModels[1].model_id).toBe('model-2');
    });

    it('should handle uppercase filter values', () => {
      const models = [createMockAIModel({ model_id: 'model-1', model_name: 'bert-model' })];

      const { result } = testHook(useAIModelsFilter)(models);

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.NAME, 'BERT');
      });

      expect(result.current.filteredModels).toHaveLength(1);
    });
  });

  describe('Filter by keyword', () => {
    it('should filter models by keyword in name', () => {
      const models = [
        createMockAIModel({
          model_id: 'model-1',
          model_name: 'bert-model',
          description: 'A BERT model',
          usecase: 'text-classification',
        }),
        createMockAIModel({
          model_id: 'model-2',
          model_name: 'gpt-model',
          description: 'A GPT model',
          usecase: 'text-generation',
        }),
      ];

      const { result } = testHook(useAIModelsFilter)(models);

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.KEYWORD, 'bert');
      });

      expect(result.current.filteredModels).toHaveLength(1);
      expect(result.current.filteredModels[0].model_id).toBe('model-1');
    });

    it('should filter models by keyword in description', () => {
      const models = [
        createMockAIModel({
          model_id: 'model-1',
          model_name: 'model-1',
          description: 'A powerful BERT model',
          usecase: 'llm',
        }),
        createMockAIModel({
          model_id: 'model-2',
          model_name: 'model-2',
          description: 'A GPT model',
          usecase: 'llm',
        }),
      ];

      const { result } = testHook(useAIModelsFilter)(models);

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.KEYWORD, 'powerful');
      });

      expect(result.current.filteredModels).toHaveLength(1);
      expect(result.current.filteredModels[0].model_id).toBe('model-1');
    });

    it('should filter models by keyword in usecase', () => {
      const models = [
        createMockAIModel({
          model_id: 'model-1',
          model_name: 'model-1',
          description: 'A model',
          usecase: 'text-generation',
        }),
        createMockAIModel({
          model_id: 'model-2',
          model_name: 'model-2',
          description: 'A model',
          usecase: 'text-classification',
        }),
      ];

      const { result } = testHook(useAIModelsFilter)(models);

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.KEYWORD, 'classification');
      });

      expect(result.current.filteredModels).toHaveLength(1);
      expect(result.current.filteredModels[0].model_id).toBe('model-2');
    });

    it('should search across all fields (name, description, usecase)', () => {
      const models = [
        createMockAIModel({
          model_id: 'model-1',
          model_name: 'bert-model',
          description: 'Text classification',
          usecase: 'llm',
        }),
        createMockAIModel({
          model_id: 'model-2',
          model_name: 'gpt-model',
          description: 'Text generation',
          usecase: 'llm',
        }),
      ];

      const { result } = testHook(useAIModelsFilter)(models);

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.KEYWORD, 'generation');
      });

      expect(result.current.filteredModels).toHaveLength(1);
      expect(result.current.filteredModels[0].model_id).toBe('model-2');
    });
  });

  describe('Filter by use case', () => {
    it('should filter models by usecase', () => {
      const models = [
        createMockAIModel({ model_id: 'model-1', usecase: 'text-generation' }),
        createMockAIModel({ model_id: 'model-2', usecase: 'text-classification' }),
        createMockAIModel({ model_id: 'model-3', usecase: 'text-generation' }),
      ];

      const { result } = testHook(useAIModelsFilter)(models);

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.USE_CASE, 'generation');
      });

      expect(result.current.filteredModels).toHaveLength(2);
      expect(result.current.filteredModels[0].model_id).toBe('model-1');
      expect(result.current.filteredModels[1].model_id).toBe('model-3');
    });

    it('should filter usecase case-insensitively', () => {
      const models = [createMockAIModel({ model_id: 'model-1', usecase: 'Text-Generation' })];

      const { result } = testHook(useAIModelsFilter)(models);

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.USE_CASE, 'GENERATION');
      });

      expect(result.current.filteredModels).toHaveLength(1);
    });
  });

  describe('Multiple filters', () => {
    it('should apply multiple filters (AND logic)', () => {
      const models = [
        createMockAIModel({
          model_id: 'model-1',
          model_name: 'bert-model',
          usecase: 'text-generation',
          description: 'BERT for generation',
        }),
        createMockAIModel({
          model_id: 'model-2',
          model_name: 'bert-classifier',
          usecase: 'text-classification',
          description: 'BERT for classification',
        }),
        createMockAIModel({
          model_id: 'model-3',
          model_name: 'gpt-model',
          usecase: 'text-generation',
          description: 'GPT for generation',
        }),
      ];

      const { result } = testHook(useAIModelsFilter)(models);

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.NAME, 'bert');
      });

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.USE_CASE, 'generation');
      });

      expect(result.current.filteredModels).toHaveLength(1);
      expect(result.current.filteredModels[0].model_id).toBe('model-1');
    });

    it('should return empty array when filters match no models', () => {
      const models = [createMockAIModel({ model_id: 'model-1', model_name: 'bert-model' })];

      const { result } = testHook(useAIModelsFilter)(models);

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.NAME, 'nonexistent');
      });

      expect(result.current.filteredModels).toHaveLength(0);
    });
  });

  describe('Clear filters', () => {
    it('should clear all filters', () => {
      const models = [
        createMockAIModel({ model_id: 'model-1', model_name: 'bert-model' }),
        createMockAIModel({ model_id: 'model-2', model_name: 'gpt-model' }),
      ];

      const { result } = testHook(useAIModelsFilter)(models);

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.NAME, 'bert');
        result.current.onFilterUpdate(AssetsFilterOptions.USE_CASE, 'llm');
      });

      expect(result.current.filteredModels).toHaveLength(1);

      act(() => {
        result.current.onClearFilters();
      });

      expect(result.current.filterData).toEqual({
        [AssetsFilterOptions.NAME]: undefined,
        [AssetsFilterOptions.KEYWORD]: undefined,
        [AssetsFilterOptions.USE_CASE]: undefined,
      });
      expect(result.current.filteredModels).toEqual(models);
    });
  });

  describe('Filter updates', () => {
    it('should update filter data when filter is changed', () => {
      const models: AIModel[] = [];
      const { result } = testHook(useAIModelsFilter)(models);

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.NAME, 'test');
      });

      expect(result.current.filterData[AssetsFilterOptions.NAME]).toBe('test');
    });

    it('should preserve other filters when updating one filter', () => {
      const models: AIModel[] = [];
      const { result } = testHook(useAIModelsFilter)(models);

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.NAME, 'name-filter');
        result.current.onFilterUpdate(AssetsFilterOptions.KEYWORD, 'keyword-filter');
      });

      expect(result.current.filterData[AssetsFilterOptions.NAME]).toBe('name-filter');
      expect(result.current.filterData[AssetsFilterOptions.KEYWORD]).toBe('keyword-filter');

      act(() => {
        result.current.onFilterUpdate(AssetsFilterOptions.USE_CASE, 'usecase-filter');
      });

      expect(result.current.filterData[AssetsFilterOptions.NAME]).toBe('name-filter');
      expect(result.current.filterData[AssetsFilterOptions.KEYWORD]).toBe('keyword-filter');
      expect(result.current.filterData[AssetsFilterOptions.USE_CASE]).toBe('usecase-filter');
    });
  });
});
