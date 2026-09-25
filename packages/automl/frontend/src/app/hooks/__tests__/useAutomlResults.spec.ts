import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { AutoXApiProvider } from '@odh-dashboard/autox-core/ui/context';
import { useS3CacheActions, useS3FileFetchers } from '@odh-dashboard/autox-core/ui/hooks';

global.fetch = jest.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(AutoXApiProvider, { apiPrefix: '/test', bffApiVersion: 'v1' }, children),
    );
  return Wrapper;
};

describe('AutoML S3 result refresh', () => {
  it('replaces stale model metadata after the shared S3 JSON cache is invalidated', async () => {
    let responseIndex = 0;
    const fetchS3File = jest.mocked(global.fetch).mockImplementation(async () => {
      const blob = {
        text: async () =>
          JSON.stringify({ name: responseIndex++ === 0 ? 'stale-model' : 'fresh-model' }),
      } as Blob;
      return { ok: true, headers: new Headers(), blob: async () => blob } as Response;
    });
    const wrapper = createWrapper();
    const { result: fetchers } = renderHook(() => useS3FileFetchers(), { wrapper });
    const { result: actions } = renderHook(() => useS3CacheActions(), { wrapper });

    await expect(fetchers.current.fetchS3Json('namespace', 'models/model.json')).resolves.toEqual({
      name: 'stale-model',
    });
    await actions.current.invalidateS3Results('namespace');
    await expect(fetchers.current.fetchS3Json('namespace', 'models/model.json')).resolves.toEqual({
      name: 'fresh-model',
    });

    expect(fetchS3File).toHaveBeenCalledTimes(2);
  });
});
