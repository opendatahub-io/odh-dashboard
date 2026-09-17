import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { fetchS3Json } from '~/app/hooks/queries';
import { usePatternEvaluationResults } from '~/app/hooks/usePatternEvaluationResults';

jest.mock('~/app/hooks/queries', () => ({
  fetchS3Json: jest.fn(),
}));

const fetchS3JsonMock = jest.mocked(fetchS3Json);

describe('usePatternEvaluationResults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should expose malformed evaluation JSON as a query error', async () => {
    fetchS3JsonMock.mockRejectedValue(new SyntaxError('Unexpected character at line 1 column 1'));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, throwOnError: true } },
    });
    const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const result = renderHook(
      () => usePatternEvaluationResults('namespace', 'rag-patterns/', 'Pattern1', true),
      { wrapper },
    );

    await waitFor(() => expect(result.result.current.isError).toBe(true));
    expect(result.result.current.error).toEqual(
      new SyntaxError('Unexpected character at line 1 column 1'),
    );
  });
});
