import React from 'react';
import { renderHook } from '@testing-library/react';
import { createK8sApi, createPipelinesApi, createS3Api } from '../../api';
import { AutoXApiProvider, useAutoXApi, type AutoXApi } from '..';

const createApi = (prefix: string): AutoXApi => ({
  k8s: createK8sApi(prefix, 'v1'),
  s3: createS3Api(prefix, 'v1'),
  pipelines: createPipelinesApi(prefix, 'v1'),
});

const createWrapper = (api: AutoXApi) =>
  function Wrapper({ children }: React.PropsWithChildren) {
    return <AutoXApiProvider api={api}>{children}</AutoXApiProvider>;
  };

describe('AutoXApiProvider', () => {
  it('should provide the injected APIs at the top level', () => {
    const api = createApi('/automl');
    const { result } = renderHook(() => useAutoXApi(), { wrapper: createWrapper(api) });

    expect(result.current).toBe(api);
    expect(result.current).toEqual({
      k8s: expect.any(Object),
      s3: expect.any(Object),
      pipelines: expect.any(Object),
    });
  });

  it('should preserve the injected API object when rerendered', () => {
    const api = createApi('/automl');
    const { result, rerender } = renderHook(() => useAutoXApi(), {
      wrapper: createWrapper(api),
    });
    const initialValue = result.current;

    rerender();

    expect(result.current).toBe(initialValue);
  });

  it('should throw clearly when used without a provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      expect(() => renderHook(() => useAutoXApi())).toThrow(
        'useAutoXApi must be used within an AutoXApiProvider',
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it('should isolate nested providers', () => {
    const outer = createApi('/outer');
    const inner = createApi('/inner');
    const { result } = renderHook(() => useAutoXApi(), {
      wrapper: ({ children }) => (
        <AutoXApiProvider api={outer}>
          <AutoXApiProvider api={inner}>{children}</AutoXApiProvider>
        </AutoXApiProvider>
      ),
    });

    expect(result.current).toBe(inner);
    expect(result.current).not.toBe(outer);
  });
});
