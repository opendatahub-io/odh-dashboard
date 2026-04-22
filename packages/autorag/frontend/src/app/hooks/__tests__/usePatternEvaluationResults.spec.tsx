/* eslint-disable camelcase */
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePatternEvaluationResults } from '~/app/hooks/usePatternEvaluationResults';
import { fetchS3File } from '~/app/hooks/queries';
import type { AutoRAGEvaluationResult } from '~/app/types/autoragPattern';

// Mock the fetchS3File function
jest.mock('~/app/hooks/queries', () => ({
  fetchS3File: jest.fn(),
}));

const mockFetchS3File = jest.mocked(fetchS3File);

describe('usePatternEvaluationResults', () => {
  const mockNamespace = 'test-namespace';
  const mockRagPatternsBasePath =
    'documents-rag-optimization-pipeline/run-123/rag-templates-optimization/uuid-456/rag_patterns';
  const mockPatternName = 'pattern0';
  const mockEvaluationResults: AutoRAGEvaluationResult[] = [
    {
      question: 'Test question 1',
      correct_answers: ['Expected answer 1'],
      question_id: 'q1',
      answer: 'Generated answer 1',
      answer_contexts: [
        { text: 'Context from doc1', document_id: 'doc1' },
        { text: 'Context from doc3', document_id: 'doc3' },
      ],
      scores: {
        answer_correctness: 0.85,
        faithfulness: 0.75,
        context_correctness: 0.8,
      },
    },
    {
      question: 'Test question 2',
      correct_answers: ['Expected answer 2'],
      question_id: 'q2',
      answer: 'Generated answer 2',
      answer_contexts: [
        { text: 'Context from doc3', document_id: 'doc3' },
        { text: 'Context from doc4', document_id: 'doc4' },
      ],
      scores: {
        answer_correctness: 0.95,
        faithfulness: 1.0,
        context_correctness: 0.9,
      },
    },
  ];

  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const createWrapper = () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return wrapper;
  };

  it('should not fetch when enabled is false', () => {
    const { result } = renderHook(
      () =>
        usePatternEvaluationResults(mockNamespace, mockRagPatternsBasePath, mockPatternName, false),
      { wrapper: createWrapper() },
    );

    expect(result.current.isPending).toBe(true);
    expect(result.current.isFetching).toBe(false);
    expect(mockFetchS3File).not.toHaveBeenCalled();
  });

  it('should not fetch when namespace is missing', () => {
    const { result } = renderHook(
      () => usePatternEvaluationResults(undefined, mockRagPatternsBasePath, mockPatternName, true),
      { wrapper: createWrapper() },
    );

    expect(result.current.isPending).toBe(true);
    expect(result.current.isFetching).toBe(false);
    expect(mockFetchS3File).not.toHaveBeenCalled();
  });

  it('should not fetch when ragPatternsBasePath is missing', () => {
    const { result } = renderHook(
      () => usePatternEvaluationResults(mockNamespace, undefined, mockPatternName, true),
      { wrapper: createWrapper() },
    );

    expect(result.current.isPending).toBe(true);
    expect(result.current.isFetching).toBe(false);
    expect(mockFetchS3File).not.toHaveBeenCalled();
  });

  it('should not fetch when patternName is missing', () => {
    const { result } = renderHook(
      () => usePatternEvaluationResults(mockNamespace, mockRagPatternsBasePath, undefined, true),
      { wrapper: createWrapper() },
    );

    expect(result.current.isPending).toBe(true);
    expect(result.current.isFetching).toBe(false);
    expect(mockFetchS3File).not.toHaveBeenCalled();
  });

  it('should fetch successfully with valid params', async () => {
    const mockBlob = {
      text: jest.fn().mockResolvedValue(JSON.stringify(mockEvaluationResults)),
    } as unknown as Blob;
    mockFetchS3File.mockResolvedValue(mockBlob);

    const { result } = renderHook(
      () =>
        usePatternEvaluationResults(mockNamespace, mockRagPatternsBasePath, mockPatternName, true),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetchS3File).toHaveBeenCalledTimes(1);
    expect(mockFetchS3File).toHaveBeenCalledWith(
      mockNamespace,
      `${mockRagPatternsBasePath}/${mockPatternName}/evaluation_results.json`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result.current.data).toEqual(mockEvaluationResults);
  });

  it('should handle empty array response', async () => {
    const mockBlob = {
      text: jest.fn().mockResolvedValue(JSON.stringify([])),
    } as unknown as Blob;
    mockFetchS3File.mockResolvedValue(mockBlob);

    const { result } = renderHook(
      () =>
        usePatternEvaluationResults(mockNamespace, mockRagPatternsBasePath, mockPatternName, true),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('should handle JSON parse errors', async () => {
    const mockBlob = {
      text: jest.fn().mockResolvedValue('invalid json{'),
    } as unknown as Blob;
    mockFetchS3File.mockResolvedValue(mockBlob);

    const { result } = renderHook(
      () =>
        usePatternEvaluationResults(mockNamespace, mockRagPatternsBasePath, mockPatternName, true),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toContain('JSON');
  });

  it('should reject non-array response', async () => {
    const mockBlob = {
      text: jest.fn().mockResolvedValue(JSON.stringify({ not: 'an array' })),
    } as unknown as Blob;
    mockFetchS3File.mockResolvedValue(mockBlob);

    const { result } = renderHook(
      () =>
        usePatternEvaluationResults(mockNamespace, mockRagPatternsBasePath, mockPatternName, true),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe(
      'Invalid evaluation results: expected array, got object',
    );
  });

  it('should reject null response', async () => {
    const mockBlob = {
      text: jest.fn().mockResolvedValue(JSON.stringify(null)),
    } as unknown as Blob;
    mockFetchS3File.mockResolvedValue(mockBlob);

    const { result } = renderHook(
      () =>
        usePatternEvaluationResults(mockNamespace, mockRagPatternsBasePath, mockPatternName, true),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe(
      'Invalid evaluation results: expected array, got object',
    );
  });

  it('should handle fetch errors', async () => {
    const fetchError = new Error('Failed to fetch file: Network error');
    mockFetchS3File.mockRejectedValue(fetchError);

    const { result } = renderHook(
      () =>
        usePatternEvaluationResults(mockNamespace, mockRagPatternsBasePath, mockPatternName, true),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe('Failed to fetch file: Network error');
  });

  it('should construct correct S3 key path', async () => {
    const mockBlob = {
      text: jest.fn().mockResolvedValue(JSON.stringify(mockEvaluationResults)),
    } as unknown as Blob;
    mockFetchS3File.mockResolvedValue(mockBlob);

    renderHook(
      () =>
        usePatternEvaluationResults(mockNamespace, mockRagPatternsBasePath, mockPatternName, true),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(mockFetchS3File).toHaveBeenCalled();
    });

    const expectedKey = `${mockRagPatternsBasePath}/${mockPatternName}/evaluation_results.json`;
    expect(mockFetchS3File).toHaveBeenCalledWith(mockNamespace, expectedKey, expect.any(Object));
  });

  it('should support abort signal for cancellation', async () => {
    const mockBlob = {
      text: jest.fn().mockResolvedValue(JSON.stringify(mockEvaluationResults)),
    } as unknown as Blob;
    mockFetchS3File.mockResolvedValue(mockBlob);

    const { unmount } = renderHook(
      () =>
        usePatternEvaluationResults(mockNamespace, mockRagPatternsBasePath, mockPatternName, true),
      { wrapper: createWrapper() },
    );

    // Unmount before the query completes to trigger abort
    unmount();

    // Verify abort signal was passed to fetchS3File
    expect(mockFetchS3File).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('should enable query when all params are provided and enabled is true', async () => {
    const mockBlob = {
      text: jest.fn().mockResolvedValue(JSON.stringify(mockEvaluationResults)),
    } as unknown as Blob;
    mockFetchS3File.mockResolvedValue(mockBlob);

    const { result } = renderHook(
      () =>
        usePatternEvaluationResults(mockNamespace, mockRagPatternsBasePath, mockPatternName, true),
      { wrapper: createWrapper() },
    );

    // Should start fetching immediately
    expect(result.current.isFetching || result.current.isSuccess).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
