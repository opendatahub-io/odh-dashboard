import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useRecommendationModelProfiles from '~/app/hooks/useRecommendationModelProfiles';

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useRecommendationModelProfiles', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('does not expose preview profiles in production, including on manual refetch', async () => {
    process.env.NODE_ENV = 'production';
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useRecommendationModelProfiles('test-namespace'), {
      wrapper: createWrapper(queryClient),
    });

    expect(queryClient.getQueryCache().getAll()[0].queryKey).toEqual([
      'evalhub',
      'collection-generation',
      'models',
      'test-namespace',
    ]);
    expect(result.current.isFetching).toBe(false);

    await act(async () => {
      await result.current.refetch();
    });

    expect(
      queryClient.getQueryData(['evalhub', 'collection-generation', 'models', 'test-namespace']),
    ).toEqual([]);
  });
});
