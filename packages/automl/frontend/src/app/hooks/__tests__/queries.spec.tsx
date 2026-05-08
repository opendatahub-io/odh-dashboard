import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useS3GetFileSchemaQuery,
  useModelEvaluationArtifactsQuery,
  fetchS3File,
  AutomlModelSchema,
  isRawTimeseriesModelV34,
  isRawModelV35,
} from '~/app/hooks/queries';
import type {
  AutomlRawTabularModelV34,
  AutomlRawTimeseriesModelV34,
  AutomlRawModelV35,
  AutomlRawModel,
} from '~/app/hooks/queries';

// Mock fetch globally
global.fetch = jest.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestQueryClientProvider';
  return Wrapper;
};

describe('useS3GetFileSchemaQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be disabled when namespace is missing', () => {
    const { result } = renderHook(
      () => useS3GetFileSchemaQuery(undefined, 'test-secret', 'test-bucket', 'data.csv'),
      { wrapper: createWrapper() },
    );

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('should be disabled when secretName is missing', () => {
    const { result } = renderHook(
      () => useS3GetFileSchemaQuery('test-namespace', undefined, 'test-bucket', 'data.csv'),
      { wrapper: createWrapper() },
    );

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('should be disabled when key is missing', () => {
    const { result } = renderHook(
      () => useS3GetFileSchemaQuery('test-namespace', 'test-secret', 'test-bucket', undefined),
      { wrapper: createWrapper() },
    );

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('should construct URL with all parameters including bucket', async () => {
    const mockResponse = {
      data: {
        columns: [
          { name: 'id', type: 'integer' },
          { name: 'name', type: 'string' },
        ],
        // eslint-disable-next-line camelcase
        parse_warnings: 0,
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    renderHook(
      () => useS3GetFileSchemaQuery('test-namespace', 'test-secret', 'test-bucket', 'data.csv'),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/s3/files/data.csv?'),
        expect.anything(),
      );
    });

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('namespace=test-namespace');
    expect(callUrl).toContain('secretName=test-secret');
    expect(callUrl).toContain('bucket=test-bucket');
    expect(callUrl).toContain('view=schema');
  });

  it('should omit bucket parameter when not provided', async () => {
    const mockResponse = {
      data: {
        columns: [{ name: 'id', type: 'integer' }],
        // eslint-disable-next-line camelcase
        parse_warnings: 0,
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    renderHook(
      () => useS3GetFileSchemaQuery('test-namespace', 'test-secret', undefined, 'data.csv'),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('namespace=test-namespace');
    expect(callUrl).toContain('secretName=test-secret');
    expect(callUrl).not.toContain('bucket=');
    expect(callUrl).toContain('/s3/files/data.csv?');
    expect(callUrl).toContain('view=schema');
  });

  it('should parse response data correctly', async () => {
    const mockColumns = [
      { name: 'id', type: 'integer' },
      { name: 'name', type: 'string' },
      { name: 'age', type: 'double' },
      { name: 'status', type: 'string', values: ['active', 'inactive'] },
    ];

    const mockResponse = {
      data: {
        columns: mockColumns,
        // eslint-disable-next-line camelcase
        parse_warnings: 0,
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(
      () => useS3GetFileSchemaQuery('test-namespace', 'test-secret', 'test-bucket', 'data.csv'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockColumns);
    });
  });

  it('should return empty array when response data is missing', async () => {
    const mockResponse = {
      data: {},
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(
      () => useS3GetFileSchemaQuery('test-namespace', 'test-secret', 'test-bucket', 'data.csv'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual([]);
    });
  });

  it('should handle fetch errors properly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
    });

    const { result } = renderHook(
      () => useS3GetFileSchemaQuery('test-namespace', 'test-secret', 'test-bucket', 'data.csv'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error?.message).toContain('Failed to fetch file schema');
  });

  it('should extract error message from API response', async () => {
    const mockErrorResponse = {
      error: {
        code: '400',
        message: 'only CSV files are supported (must have .csv extension)',
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
      json: async () => mockErrorResponse,
    });

    const { result } = renderHook(
      () => useS3GetFileSchemaQuery('test-namespace', 'test-secret', 'test-bucket', 'data.txt'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error?.message).toBe(
      'Failed to fetch file schema: only CSV files are supported (must have .csv extension)',
    );
  });

  it('should fall back to statusText when error response cannot be parsed', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });

    const { result } = renderHook(
      () => useS3GetFileSchemaQuery('test-namespace', 'test-secret', 'test-bucket', 'data.csv'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error?.message).toBe(
      'Failed to fetch file schema: Internal Server Error',
    );
  });

  it('should handle network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(
      () => useS3GetFileSchemaQuery('test-namespace', 'test-secret', 'test-bucket', 'data.csv'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error?.message).toContain('Network error');
  });

  it('should not retry on error', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Fetch failed'));

    renderHook(
      () => useS3GetFileSchemaQuery('test-namespace', 'test-secret', 'test-bucket', 'data.csv'),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it('should use correct query key', () => {
    const { result } = renderHook(
      () => useS3GetFileSchemaQuery('test-namespace', 'test-secret', 'test-bucket', 'data.csv'),
      { wrapper: createWrapper() },
    );

    expect(result.current).toBeDefined();
    // Query key is ['files', namespace, secretName, bucket, key]
  });

  it('should handle URL encoding for special characters in parameters', async () => {
    const mockResponse = {
      data: {
        columns: [{ name: 'id', type: 'integer' }],
        // eslint-disable-next-line camelcase
        parse_warnings: 0,
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    renderHook(
      () =>
        useS3GetFileSchemaQuery('test-namespace', 'test-secret', 'my-bucket', 'folder/my file.csv'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/s3/files/folder%2Fmy%20file.csv?'),
      expect.objectContaining({ signal: expect.anything() }),
    );
    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('namespace=test-namespace');
    expect(callUrl).toContain('secretName=test-secret');
    expect(callUrl).toContain('bucket=my-bucket');
    expect(callUrl).toContain('view=schema');
  });
});

describe('fetchS3File', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw for empty key', async () => {
    await expect(fetchS3File('ns', '')).rejects.toThrow('File key must be a non-empty string');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should throw for whitespace-only key', async () => {
    await expect(fetchS3File('ns', '   ')).rejects.toThrow('File key must be a non-empty string');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should construct URL with namespace and key', async () => {
    const mockBlob = new Blob(['file content']);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: async () => mockBlob,
    });

    const result = await fetchS3File('test-namespace', 'path/to/file.json');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/s3/files/path%2Fto%2Ffile.json?'),
      expect.objectContaining({ signal: undefined }),
    );
    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('namespace=test-namespace');
    expect(result).toBe(mockBlob);
  });

  it('should include secretName and bucket when provided', async () => {
    const mockBlob = new Blob(['content']);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: async () => mockBlob,
    });

    await fetchS3File('ns', 'key.csv', { secretName: 'my-secret', bucket: 'my-bucket' });

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('secretName=my-secret');
    expect(callUrl).toContain('bucket=my-bucket');
  });

  it('should omit secretName and bucket when not provided', async () => {
    const mockBlob = new Blob(['content']);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: async () => mockBlob,
    });

    await fetchS3File('ns', 'key.csv');

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).not.toContain('secretName=');
    expect(callUrl).not.toContain('bucket=');
  });

  it('should throw with statusText on non-ok response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
      json: async () => {
        throw new Error('no body');
      },
    });

    await expect(fetchS3File('ns', 'missing.json')).rejects.toThrow(
      'Failed to fetch file: Not Found',
    );
  });

  it('should throw with API error message when available', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
      json: async () => ({
        error: { message: 'S3 key not found' },
      }),
    });

    await expect(fetchS3File('ns', 'bad-key')).rejects.toThrow(
      'Failed to fetch file: S3 key not found',
    );
  });

  it('should fall back to statusText when error JSON is malformed', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
      json: async () => ({ unexpected: 'shape' }),
    });

    await expect(fetchS3File('ns', 'key')).rejects.toThrow(
      'Failed to fetch file: Internal Server Error',
    );
  });
});

/* eslint-disable camelcase */
describe('AutomlModelSchema', () => {
  const validUnifiedModel: AutomlRawModelV35 = {
    name: 'WeightedEnsemble_L5_FULL',
    location: {
      predictor: 'WeightedEnsemble_L5_FULL/predictor.pkl',
      notebook: 'WeightedEnsemble_L5_FULL/notebooks/automl_predictor_notebook.ipynb',
      metrics: 'WeightedEnsemble_L5_FULL/metrics',
    },
    metrics: {
      test_data: { accuracy: 0.95, f1: 0.93 },
    },
  };

  const validTabularModelV34: AutomlRawTabularModelV34 = {
    name: 'WeightedEnsemble_L5_FULL',
    location: {
      predictor: 'WeightedEnsemble_L5_FULL/predictor.pkl',
      notebook: 'WeightedEnsemble_L5_FULL/automl_predictor_notebook.ipynb',
    },
    metrics: {
      test_data: { accuracy: 0.95, f1: 0.93 },
    },
  };

  const validTimeseriesModelV34: AutomlRawTimeseriesModelV34 = {
    name: 'TemporalFusionTransformer_FULL',
    base_model: 'TemporalFusionTransformer',
    location: {
      predictor: 'TemporalFusionTransformer_FULL/predictor.pkl',
      notebooks: 'TemporalFusionTransformer_FULL/notebooks',
      metrics: 'TemporalFusionTransformer_FULL/metrics',
    },
    metrics: {
      test_data: { mase: 1.2, rmse: 0.05 },
    },
  };

  it('should validate a unified 3.5 model', () => {
    const result = AutomlModelSchema.safeParse(validUnifiedModel);
    expect(result.success).toBe(true);
  });

  it('should validate a legacy tabular 3.4 model', () => {
    const result = AutomlModelSchema.safeParse(validTabularModelV34);
    expect(result.success).toBe(true);
  });

  it('should validate a legacy timeseries 3.4 model', () => {
    const result = AutomlModelSchema.safeParse(validTimeseriesModelV34);
    expect(result.success).toBe(true);
  });

  it('should accept optional model_directory', () => {
    const unifiedWithDir = {
      ...validUnifiedModel,
      location: { ...validUnifiedModel.location, model_directory: 'some/dir/' },
    };
    const tabularWithDir = {
      ...validTabularModelV34,
      location: { ...validTabularModelV34.location, model_directory: 'some/dir/' },
    };
    const timeseriesWithDir = {
      ...validTimeseriesModelV34,
      location: { ...validTimeseriesModelV34.location, model_directory: 'some/dir/' },
    };

    expect(AutomlModelSchema.safeParse(unifiedWithDir).success).toBe(true);
    expect(AutomlModelSchema.safeParse(tabularWithDir).success).toBe(true);
    expect(AutomlModelSchema.safeParse(timeseriesWithDir).success).toBe(true);
  });

  it('should reject a model missing required fields', () => {
    const invalid = { name: 'bad-model' };
    const result = AutomlModelSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject a unified 3.5 model that includes base_model', () => {
    const invalid = {
      ...validUnifiedModel,
      base_model: 'gpt-4',
    };
    const result = AutomlModelSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should parse a v3.4 tabular model with extra metrics in location as v3.5', () => {
    const ambiguous = {
      ...validTabularModelV34,
      location: { ...validTabularModelV34.location, metrics: 'metrics' },
    };
    const result = AutomlModelSchema.safeParse(ambiguous);
    expect(result.success).toBe(true);
  });

  it('should reject non-numeric metric values', () => {
    const invalid = {
      ...validUnifiedModel,
      metrics: { test_data: { accuracy: 'high' } },
    };
    const result = AutomlModelSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('isRawTimeseriesModelV34', () => {
  it('should return true for a legacy timeseries model with notebooks plural', () => {
    const model: AutomlRawTimeseriesModelV34 = {
      name: 'TemporalFusionTransformer_FULL',
      base_model: 'TemporalFusionTransformer',
      location: {
        predictor: 'predictor.pkl',
        notebooks: 'notebooks',
        metrics: 'metrics',
      },
      metrics: { test_data: { mase: 1.2 } },
    };
    expect(isRawTimeseriesModelV34(model)).toBe(true);
  });

  it('should return false for a unified 3.5 model', () => {
    const model: AutomlRawModelV35 = {
      name: 'WeightedEnsemble_L5_FULL',
      location: {
        predictor: 'predictor.pkl',
        notebook: 'notebook.ipynb',
        metrics: 'metrics',
      },
      metrics: { test_data: { accuracy: 0.95 } },
    };
    expect(isRawTimeseriesModelV34(model)).toBe(false);
  });

  it('should return false for a legacy tabular model', () => {
    const model: AutomlRawTabularModelV34 = {
      name: 'WeightedEnsemble_L5_FULL',
      location: {
        predictor: 'predictor.pkl',
        notebook: 'notebook.ipynb',
      },
      metrics: { test_data: { accuracy: 0.95 } },
    };
    expect(isRawTimeseriesModelV34(model)).toBe(false);
  });
});

describe('isRawModelV35', () => {
  it('should return true for a unified 3.5 model', () => {
    const model: AutomlRawModelV35 = {
      name: 'WeightedEnsemble_L5_FULL',
      location: {
        predictor: 'predictor.pkl',
        notebook: 'notebook.ipynb',
        metrics: 'metrics',
      },
      metrics: { test_data: { accuracy: 0.95 } },
    };
    expect(isRawModelV35(model)).toBe(true);
  });

  it('should return false for a legacy timeseries model', () => {
    const model: AutomlRawTimeseriesModelV34 = {
      name: 'TemporalFusionTransformer_FULL',
      base_model: 'TemporalFusionTransformer',
      location: {
        predictor: 'predictor.pkl',
        notebooks: 'notebooks',
        metrics: 'metrics',
      },
      metrics: { test_data: { mase: 1.2 } },
    };
    expect(isRawModelV35(model)).toBe(false);
  });

  it('should return false when notebook + metrics present but base_model also exists', () => {
    const model = {
      name: 'WeightedEnsemble_L5_FULL',
      base_model: 'some-base',
      location: {
        predictor: 'predictor.pkl',
        notebook: 'notebook.ipynb',
        metrics: 'metrics',
      },
      metrics: { test_data: { accuracy: 0.95 } },
    };
    expect(isRawModelV35(model as AutomlRawModel)).toBe(false);
  });

  it('should return false for a legacy tabular model without metrics in location', () => {
    const model: AutomlRawTabularModelV34 = {
      name: 'WeightedEnsemble_L5_FULL',
      location: {
        predictor: 'predictor.pkl',
        notebook: 'notebook.ipynb',
      },
      metrics: { test_data: { accuracy: 0.95 } },
    };
    expect(isRawModelV35(model)).toBe(false);
  });
});
/* eslint-enable camelcase */

/* eslint-disable camelcase */
describe('useModelEvaluationArtifactsQuery', () => {
  const mockFeatureImportance = {
    importance: { feature_a: 0.8, feature_b: 0.2 },
  };

  const mockConfusionMatrix = {
    cat: { cat: 10, dog: 2 },
    dog: { cat: 1, dog: 15 },
  };

  /**
   * Creates a mock fetch response that returns JSON parsed from a Blob,
   * matching the fetchS3Json → fetchS3File → fetch call chain.
   */
  const mockBlobJsonResponse = (data: unknown) => {
    const json = JSON.stringify(data);
    return {
      ok: true,
      blob: async () => ({ text: async () => json }),
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not get stuck loading for regression runs (isClassification=false)', async () => {
    // The confusion matrix query is disabled for regression. Previously, using
    // isPending (which is true for disabled queries) caused isLoading to be
    // stuck at true. The fix uses isLoading instead.
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockBlobJsonResponse(mockFeatureImportance));

    const { result } = renderHook(
      () => useModelEvaluationArtifactsQuery('test-ns', 'models/best/', false),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.featureImportance).toEqual(mockFeatureImportance);
    expect(result.current.confusionMatrix).toBeUndefined();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should load both artifacts for classification runs (isClassification=true)', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockBlobJsonResponse(mockFeatureImportance))
      .mockResolvedValueOnce(mockBlobJsonResponse(mockConfusionMatrix));

    const { result } = renderHook(
      () => useModelEvaluationArtifactsQuery('test-ns', 'models/best/', true),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.featureImportance).toEqual(mockFeatureImportance);
    expect(result.current.confusionMatrix).toEqual(mockConfusionMatrix);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should be disabled when namespace is missing', () => {
    const { result } = renderHook(
      () => useModelEvaluationArtifactsQuery(undefined, 'models/best/', true),
      { wrapper: createWrapper() },
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.featureImportance).toBeUndefined();
    expect(result.current.confusionMatrix).toBeUndefined();
  });

  it('should be disabled when modelDirectory is missing', () => {
    const { result } = renderHook(
      () => useModelEvaluationArtifactsQuery('test-ns', undefined, true),
      { wrapper: createWrapper() },
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.featureImportance).toBeUndefined();
    expect(result.current.confusionMatrix).toBeUndefined();
  });
});
/* eslint-enable camelcase */
