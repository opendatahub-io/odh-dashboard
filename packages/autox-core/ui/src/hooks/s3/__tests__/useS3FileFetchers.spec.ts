import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import * as z from 'zod';
import type { S3Api } from '../../../api/s3/s3';
import { AutoXApiProvider } from '../../../context/AutoXApiContext';
import { useS3CacheActions, useS3FileFetchers } from '../useS3FileFetchers';

const mockS3Api: S3Api = {
  uploadFileToS3: jest.fn(),
  getFiles: jest.fn(),
  fetchS3File: jest.fn(),
  fetchS3Json: jest.fn(),
};

jest.mock('../../../api/s3/s3', () => ({
  ...jest.requireActual('../../../api/s3/s3'),
  createS3Api: jest.fn(() => mockS3Api),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(AutoXApiProvider, { apiPrefix: '/test', bffApiVersion: 'v1' }, children),
    );
  return { Wrapper, queryClient };
};

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
};

describe('useS3FileFetchers', () => {
  const fetchS3File = jest.mocked(mockS3Api.fetchS3File);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should share raw file reads through a complete query key', async () => {
    const blob = new Blob(['content']);
    fetchS3File.mockResolvedValue(blob);
    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useS3FileFetchers(), { wrapper: Wrapper });

    await result.current.fetchS3File('namespace', 'file.csv', {
      secretName: 'secret',
      bucket: 'bucket',
      view: 'raw',
      maxBytes: 100,
    });
    await result.current.fetchS3File('namespace', 'file.csv', {
      secretName: 'secret',
      bucket: 'bucket',
      view: 'raw',
      maxBytes: 100,
    });

    expect(fetchS3File).toHaveBeenCalledTimes(1);
    expect(
      queryClient.getQueryData(['s3File', 'namespace', 'file.csv', 'secret', 'bucket', 'raw', 100]),
    ).toBe(blob);
  });

  it('should cache raw JSON and parse it with each supplied schema', async () => {
    fetchS3File.mockResolvedValue({
      text: () => Promise.resolve(JSON.stringify({ value: 1 })),
    } as unknown as Blob);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useS3FileFetchers(), { wrapper: Wrapper });
    const firstSchema = await result.current.fetchS3Json('namespace', 'data.json', {
      schema: z.object({ value: z.number() }),
    });
    const secondSchema = await result.current.fetchS3Json('namespace', 'data.json', {
      schema: z.object({ value: z.number().transform(String) }),
    });

    expect(firstSchema).toEqual({ value: 1 });
    expect(secondSchema).toEqual({ value: '1' });
    expect(fetchS3File).toHaveBeenCalledTimes(1);
  });

  it('should refetch fresh JSON while keeping immutable JSON reads cached', async () => {
    fetchS3File
      .mockResolvedValueOnce({
        text: () => Promise.resolve(JSON.stringify({ version: 1 })),
      } as Blob)
      .mockResolvedValueOnce({
        text: () => Promise.resolve(JSON.stringify({ version: 2 })),
      } as Blob)
      .mockResolvedValueOnce({
        text: () => Promise.resolve(JSON.stringify({ version: 3 })),
      } as Blob);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useS3FileFetchers(), { wrapper: Wrapper });

    await expect(result.current.fetchS3Json('namespace', 'mutable.json')).resolves.toEqual({
      version: 1,
    });
    await expect(result.current.fetchS3Json('namespace', 'mutable.json')).resolves.toEqual({
      version: 1,
    });
    await expect(
      result.current.fetchS3Json('namespace', 'mutable.json', { fresh: true }),
    ).resolves.toEqual({ version: 2 });
    await expect(
      result.current.fetchS3Json('namespace', 'mutable.json', { fresh: true }),
    ).resolves.toEqual({ version: 3 });

    expect(fetchS3File).toHaveBeenCalledTimes(3);
  });

  it('should give an overlapping fresh caller a network-backed result over cached default data', async () => {
    const freshResponse = deferred<Blob>();
    let freshRequestSignal: AbortSignal | undefined;
    fetchS3File
      .mockResolvedValueOnce({
        text: () => Promise.resolve('{"version":1}'),
      } as Blob)
      .mockImplementationOnce((_namespace, _key, options) => {
        freshRequestSignal = options?.signal;
        return freshResponse.promise;
      });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useS3FileFetchers(), { wrapper: Wrapper });

    await expect(
      result.current.fetchS3Json('namespace', 'overlap.json', { maxBytes: 1024 }),
    ).resolves.toEqual({ version: 1 });
    const freshRequest = result.current.fetchS3Json('namespace', 'overlap.json', {
      maxBytes: 1024,
      fresh: true,
    });
    await waitFor(() => expect(freshRequestSignal).toBeDefined());
    expect(fetchS3File).toHaveBeenCalledTimes(2);

    freshResponse.resolve({ text: () => Promise.resolve('{"version":2}') } as Blob);
    await expect(freshRequest).resolves.toEqual({ version: 2 });
    await expect(
      result.current.fetchS3Json('namespace', 'overlap.json', { maxBytes: 1024 }),
    ).resolves.toEqual({ version: 2 });
    expect(fetchS3File).toHaveBeenCalledTimes(2);
  });

  it('should keep fresh and default flights independent when fresh starts first', async () => {
    const freshResponse = deferred<Blob>();
    const defaultResponse = deferred<Blob>();
    let requestCount = 0;
    fetchS3File.mockImplementation((_namespace, _key, options) => {
      requestCount += 1;
      if (requestCount === 1) {
        return freshResponse.promise;
      }
      expect(options?.signal).toBeDefined();
      return defaultResponse.promise;
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useS3FileFetchers(), { wrapper: Wrapper });

    const freshRequest = result.current.fetchS3Json('namespace', 'reverse.json', {
      fresh: true,
    });
    await waitFor(() => expect(requestCount).toBe(1));
    const defaultRequest = result.current.fetchS3Json('namespace', 'reverse.json');
    await waitFor(() => expect(requestCount).toBe(2));

    freshResponse.resolve({ text: () => Promise.resolve('{"source":"fresh"}') } as Blob);
    await expect(freshRequest).resolves.toEqual({ source: 'fresh' });
    defaultResponse.resolve({ text: () => Promise.resolve('{"source":"default"}') } as Blob);
    await expect(defaultRequest).resolves.toEqual({ source: 'default' });
    await expect(result.current.fetchS3Json('namespace', 'reverse.json')).resolves.toEqual({
      source: 'fresh',
    });
    expect(requestCount).toBe(2);
  });

  it.each([true, false])(
    'should preserve the fresh result for overlapping default-first flights (%s fresh response first)',
    async (freshResponseFirst) => {
      const freshResponse = deferred<Blob>();
      const defaultResponse = deferred<Blob>();
      let requestCount = 0;
      fetchS3File.mockImplementation((_namespace, _key, options) => {
        requestCount += 1;
        expect(options?.signal).toBeDefined();
        return requestCount === 1 ? defaultResponse.promise : freshResponse.promise;
      });
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useS3FileFetchers(), { wrapper: Wrapper });

      const defaultRequest = result.current.fetchS3Json('namespace', 'ordered.json');
      await waitFor(() => expect(requestCount).toBe(1));
      const freshRequest = result.current.fetchS3Json('namespace', 'ordered.json', {
        fresh: true,
      });
      await waitFor(() => expect(requestCount).toBe(2));

      const resolveFresh = () =>
        freshResponse.resolve({ text: () => Promise.resolve('{"source":"fresh"}') } as Blob);
      const resolveDefault = () =>
        defaultResponse.resolve({ text: () => Promise.resolve('{"source":"default"}') } as Blob);
      if (freshResponseFirst) {
        resolveFresh();
        await expect(freshRequest).resolves.toEqual({ source: 'fresh' });
        resolveDefault();
      } else {
        resolveDefault();
        await expect(defaultRequest).resolves.toEqual({ source: 'default' });
        resolveFresh();
      }

      await expect(defaultRequest).resolves.toEqual({ source: 'default' });
      await expect(freshRequest).resolves.toEqual({ source: 'fresh' });
      await expect(result.current.fetchS3Json('namespace', 'ordered.json')).resolves.toEqual({
        source: 'fresh',
      });
      expect(requestCount).toBe(2);
    },
  );

  it('should not resurrect a fresh marker after canonical cache removal', async () => {
    const freshResponse = deferred<Blob>();
    const defaultResponse = deferred<Blob>();
    fetchS3File
      .mockResolvedValueOnce({
        text: () => Promise.resolve('{"source":"obsolete"}'),
      } as Blob)
      .mockImplementationOnce(() => freshResponse.promise)
      .mockImplementationOnce((_namespace, _key, options) => {
        options?.signal?.addEventListener(
          'abort',
          () => defaultResponse.reject(new DOMException('Aborted', 'AbortError')),
          { once: true },
        );
        return defaultResponse.promise;
      })
      .mockResolvedValueOnce({
        text: () => Promise.resolve('{"source":"replacement"}'),
      } as Blob);
    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useS3FileFetchers(), { wrapper: Wrapper });
    const canonicalKey = [
      's3Json',
      'namespace',
      'removed.json',
      undefined,
      undefined,
      undefined,
      50 * 1024 * 1024,
    ];

    await expect(result.current.fetchS3Json('namespace', 'removed.json')).resolves.toEqual({
      source: 'obsolete',
    });
    await queryClient.invalidateQueries({
      queryKey: canonicalKey,
      exact: true,
      refetchType: 'none',
    });

    const freshRequest = result.current.fetchS3Json('namespace', 'removed.json', { fresh: true });
    const defaultController = new AbortController();
    const defaultRequest = result.current.fetchS3Json('namespace', 'removed.json', {
      signal: defaultController.signal,
    });
    await waitFor(() => expect(fetchS3File).toHaveBeenCalledTimes(3));

    freshResponse.resolve({ text: () => Promise.resolve('{"source":"fresh"}') } as Blob);
    await expect(freshRequest).resolves.toEqual({ source: 'fresh' });
    defaultController.abort();
    await expect(defaultRequest).rejects.toThrow();
    queryClient.removeQueries({ queryKey: canonicalKey, exact: true });

    await expect(result.current.fetchS3Json('namespace', 'removed.json')).resolves.toEqual({
      source: 'replacement',
    });
    expect(fetchS3File).toHaveBeenCalledTimes(4);
  });

  it.each([true, false])(
    'should isolate cancellation between fresh and default flights (%s fresh caller aborts)',
    async (abortFreshCaller) => {
      const freshResponse = deferred<Blob>();
      const defaultResponse = deferred<Blob>();
      const signals: AbortSignal[] = [];
      let requestCount = 0;
      fetchS3File.mockImplementation((_namespace, _key, options) => {
        requestCount += 1;
        if (options?.signal) {
          signals.push(options.signal);
        }
        return requestCount === 1 ? freshResponse.promise : defaultResponse.promise;
      });
      const freshController = new AbortController();
      const defaultController = new AbortController();
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useS3FileFetchers(), { wrapper: Wrapper });

      const freshRequest = result.current.fetchS3Json('namespace', 'cancel-overlap.json', {
        fresh: true,
        signal: freshController.signal,
      });
      const defaultRequest = result.current.fetchS3Json('namespace', 'cancel-overlap.json', {
        signal: defaultController.signal,
      });
      await waitFor(() => expect(requestCount).toBe(2));

      (abortFreshCaller ? freshController : defaultController).abort();
      await expect(abortFreshCaller ? freshRequest : defaultRequest).rejects.toThrow();
      expect(
        signals.every((signal, index) => signal.aborted === (index === (abortFreshCaller ? 0 : 1))),
      ).toBe(true);

      (abortFreshCaller ? defaultResponse : freshResponse).resolve({
        text: () => Promise.resolve('{"active":true}'),
      } as Blob);
      await expect(abortFreshCaller ? defaultRequest : freshRequest).resolves.toEqual({
        active: true,
      });
    },
  );

  it('should abort the S3 request when the caller signal aborts', async () => {
    let requestSignal: AbortSignal | undefined;
    fetchS3File.mockImplementation((_namespace, _key, options) => {
      requestSignal = options?.signal;
      return new Promise<Blob>((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      });
    });
    const controller = new AbortController();
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useS3FileFetchers(), { wrapper: Wrapper });
    const request = result.current.fetchS3Json('namespace', 'live.json', {
      signal: controller.signal,
      maxBytes: 1024,
    });

    await waitFor(() => expect(requestSignal).toBeDefined());
    controller.abort();

    await expect(request).rejects.toThrow();
    expect(requestSignal?.aborted).toBe(true);
  });

  it('should abort the S3 request when the React Query signal is cancelled', async () => {
    let requestSignal: AbortSignal | undefined;
    fetchS3File.mockImplementation((_namespace, _key, options) => {
      requestSignal = options?.signal;
      return new Promise<Blob>((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      });
    });
    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useS3FileFetchers(), { wrapper: Wrapper });
    const request = result.current.fetchS3Json('namespace', 'live.json');

    await waitFor(() => expect(requestSignal).toBeDefined());
    await queryClient.cancelQueries({ queryKey: ['s3Json', 'namespace', 'live.json'] });

    await expect(request).rejects.toThrow();
    expect(requestSignal?.aborted).toBe(true);
  });

  it('should reject only the first overlapping caller when it aborts', async () => {
    const response = deferred<Blob>();
    let requestSignal: AbortSignal | undefined;
    fetchS3File.mockImplementation((_namespace, _key, options) => {
      requestSignal = options?.signal;
      return response.promise;
    });
    const firstController = new AbortController();
    const secondController = new AbortController();
    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useS3FileFetchers(), { wrapper: Wrapper });

    const first = result.current.fetchS3Json('namespace', 'shared.json', {
      signal: firstController.signal,
    });
    const second = result.current.fetchS3Json('namespace', 'shared.json', {
      signal: secondController.signal,
    });
    await waitFor(() => expect(requestSignal).toBeDefined());

    firstController.abort();
    await expect(first).rejects.toThrow();
    expect(requestSignal?.aborted).toBe(false);

    response.resolve({ text: () => Promise.resolve('{"ok":true}') } as Blob);
    await expect(second).resolves.toEqual({ ok: true });
    expect(
      queryClient.getQueryData([
        's3Json',
        'namespace',
        'shared.json',
        undefined,
        undefined,
        undefined,
        50 * 1024 * 1024,
      ]),
    ).toBe('{"ok":true}');
  });

  it('should reject only the second overlapping caller when it aborts', async () => {
    const response = deferred<Blob>();
    let requestSignal: AbortSignal | undefined;
    fetchS3File.mockImplementation((_namespace, _key, options) => {
      requestSignal = options?.signal;
      return response.promise;
    });
    const firstController = new AbortController();
    const secondController = new AbortController();
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useS3FileFetchers(), { wrapper: Wrapper });

    const first = result.current.fetchS3Json('namespace', 'shared.json', {
      signal: firstController.signal,
    });
    const second = result.current.fetchS3Json('namespace', 'shared.json', {
      signal: secondController.signal,
    });
    await waitFor(() => expect(requestSignal).toBeDefined());

    secondController.abort();
    await expect(second).rejects.toThrow();
    expect(requestSignal?.aborted).toBe(false);

    response.resolve({ text: () => Promise.resolve('{"ok":true}') } as Blob);
    await expect(first).resolves.toEqual({ ok: true });
  });

  it.each([true, false])(
    'should abort an all-caller flight and start a new request afterward (%s caller first)',
    async (abortFirstCaller) => {
      const firstResponse = deferred<Blob>();
      const secondResponse = { text: () => Promise.resolve('{"attempt":2}') } as Blob;
      let requestCount = 0;
      let firstRequestSignal: AbortSignal | undefined;
      fetchS3File.mockImplementation((_namespace, _key, options) => {
        requestCount += 1;
        if (requestCount === 1) {
          firstRequestSignal = options?.signal;
          options?.signal?.addEventListener(
            'abort',
            () => firstResponse.reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
          return firstResponse.promise;
        }
        return Promise.resolve(secondResponse);
      });
      const firstController = new AbortController();
      const secondController = new AbortController();
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useS3FileFetchers(), { wrapper: Wrapper });

      const first = result.current.fetchS3Json('namespace', 'cancelled.json', {
        signal: firstController.signal,
      });
      const second = result.current.fetchS3Json('namespace', 'cancelled.json', {
        signal: secondController.signal,
      });
      await waitFor(() => expect(firstRequestSignal).toBeDefined());

      (abortFirstCaller ? firstController : secondController).abort();
      (abortFirstCaller ? secondController : firstController).abort();
      await expect(first).rejects.toThrow();
      await expect(second).rejects.toThrow();
      expect(firstRequestSignal?.aborted).toBe(true);

      await expect(result.current.fetchS3Json('namespace', 'cancelled.json')).resolves.toEqual({
        attempt: 2,
      });
      expect(requestCount).toBe(2);
    },
  );

  it('should not let an already-aborted caller poison a live caller', async () => {
    const response = deferred<Blob>();
    let requestSignal: AbortSignal | undefined;
    fetchS3File.mockImplementation((_namespace, _key, options) => {
      requestSignal = options?.signal;
      return response.promise;
    });
    const abortedController = new AbortController();
    abortedController.abort();
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useS3FileFetchers(), { wrapper: Wrapper });

    const aborted = result.current.fetchS3Json('namespace', 'already-aborted.json', {
      signal: abortedController.signal,
    });
    await expect(aborted).rejects.toThrow();

    const live = result.current.fetchS3Json('namespace', 'already-aborted.json');
    await waitFor(() => expect(requestSignal).toBeDefined());
    expect(requestSignal?.aborted).toBe(false);
    response.resolve({ text: () => Promise.resolve('{"live":true}') } as Blob);
    await expect(live).resolves.toEqual({ live: true });
    expect(fetchS3File).toHaveBeenCalledTimes(1);
  });

  it('should not start a sole flight cancelled before deferred startup', async () => {
    fetchS3File.mockResolvedValue({
      text: () => Promise.resolve('{"unexpected":true}'),
    } as Blob);
    const controller = new AbortController();
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useS3FileFetchers(), { wrapper: Wrapper });

    const request = result.current.fetchS3Json('namespace', 'pre-start.json', {
      signal: controller.signal,
    });
    controller.abort();

    await expect(request).rejects.toThrow();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(fetchS3File).not.toHaveBeenCalled();
  });

  it('should preserve a valid immutable cache when a fresh flight is cancelled before startup', async () => {
    fetchS3File.mockResolvedValueOnce({
      text: () => Promise.resolve('{"version":1}'),
    } as Blob);
    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useS3FileFetchers(), { wrapper: Wrapper });

    await expect(
      result.current.fetchS3Json('namespace', 'cached.json', { maxBytes: 1024 }),
    ).resolves.toEqual({ version: 1 });
    const cachedQueryKey = [
      's3Json',
      'namespace',
      'cached.json',
      undefined,
      undefined,
      undefined,
      1024,
    ];
    expect(queryClient.getQueryData(cachedQueryKey)).toBe('{"version":1}');

    const controller = new AbortController();
    const cancelledFreshRequest = result.current.fetchS3Json('namespace', 'cached.json', {
      maxBytes: 1024,
      fresh: true,
      signal: controller.signal,
    });
    controller.abort();
    await expect(cancelledFreshRequest).rejects.toThrow();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(queryClient.getQueryData(cachedQueryKey)).toBe('{"version":1}');
    await expect(
      result.current.fetchS3Json('namespace', 'cached.json', { maxBytes: 1024 }),
    ).resolves.toEqual({ version: 1 });
    expect(fetchS3File).toHaveBeenCalledTimes(1);
  });

  it('should not let cancelled fresh cleanup affect an immediately replaced fresh flight', async () => {
    const firstResponse = deferred<Blob>();
    const replacementResponse = deferred<Blob>();
    let requestCount = 0;
    fetchS3File.mockImplementation((_namespace, _key, options) => {
      requestCount += 1;
      if (requestCount === 1) {
        return firstResponse.promise;
      }
      expect(options?.signal).toBeDefined();
      return replacementResponse.promise;
    });
    const firstController = new AbortController();
    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useS3FileFetchers(), { wrapper: Wrapper });
    const transientKey = [
      's3Json',
      'namespace',
      'replaced.json',
      undefined,
      undefined,
      undefined,
      50 * 1024 * 1024,
      '__fresh__',
    ];

    const firstRequest = result.current.fetchS3Json('namespace', 'replaced.json', {
      fresh: true,
      signal: firstController.signal,
    });
    await waitFor(() => expect(requestCount).toBe(1));
    firstController.abort();
    await expect(firstRequest).rejects.toThrow();

    const replacementRequest = result.current.fetchS3Json('namespace', 'replaced.json', {
      fresh: true,
    });
    await waitFor(() => expect(requestCount).toBe(2));

    firstResponse.resolve({ text: () => Promise.resolve('{"source":"stale"}') } as Blob);
    await Promise.resolve();
    expect(queryClient.getQueryState(transientKey)).toBeDefined();

    replacementResponse.resolve({
      text: () => Promise.resolve('{"source":"replacement"}'),
    } as Blob);
    await expect(replacementRequest).resolves.toEqual({ source: 'replacement' });
    expect(queryClient.getQueryState(transientKey)).toBeUndefined();
    expect(
      queryClient.getQueryData([
        's3Json',
        'namespace',
        'replaced.json',
        undefined,
        undefined,
        undefined,
        50 * 1024 * 1024,
      ]),
    ).toBe('{"source":"replacement"}');
  });

  it('should forward an imperative download signal and cache the result', async () => {
    const blob = new Blob(['content']);
    fetchS3File.mockResolvedValue(blob);
    const controller = new AbortController();
    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useS3FileFetchers(), { wrapper: Wrapper });

    await result.current.fetchS3File('namespace', 'file.csv', { signal: controller.signal });

    expect(fetchS3File).toHaveBeenCalledWith(
      'namespace',
      'file.csv',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(
      queryClient.getQueryData([
        's3File',
        'namespace',
        'file.csv',
        undefined,
        undefined,
        undefined,
        undefined,
      ]),
    ).toBe(blob);
  });

  it('should refetch JSON after the scoped cache action invalidates it', async () => {
    fetchS3File
      .mockResolvedValueOnce({
        text: () => Promise.resolve(JSON.stringify({ name: 'stale-model' })),
      } as Blob)
      .mockResolvedValueOnce({
        text: () => Promise.resolve(JSON.stringify({ name: 'fresh-model' })),
      } as Blob);
    const { Wrapper } = createWrapper();
    const { result: fetchers } = renderHook(() => useS3FileFetchers(), { wrapper: Wrapper });
    const { result: actions } = renderHook(() => useS3CacheActions(), { wrapper: Wrapper });

    await expect(fetchers.current.fetchS3Json('namespace', 'models/model.json')).resolves.toEqual({
      name: 'stale-model',
    });
    await actions.current.invalidateS3JsonCache('namespace', 'models/model.json');
    await expect(fetchers.current.fetchS3Json('namespace', 'models/model.json')).resolves.toEqual({
      name: 'fresh-model',
    });

    await waitFor(() => expect(fetchS3File).toHaveBeenCalledTimes(2));
  });
});
