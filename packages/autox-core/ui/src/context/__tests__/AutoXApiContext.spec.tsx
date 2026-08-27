import React from 'react';
import { renderHook } from '@testing-library/react';
import { AutoXApiProvider, useAutoXApi } from '..';

const createWrapper = (apiPrefix: string) =>
  function Wrapper({ children }: React.PropsWithChildren) {
    return (
      <AutoXApiProvider apiPrefix={apiPrefix} bffApiVersion="v1">
        {children}
      </AutoXApiProvider>
    );
  };

describe('AutoXApiProvider', () => {
  it('should provide the shared APIs at the top level', () => {
    const { result } = renderHook(() => useAutoXApi(), { wrapper: createWrapper('/automl') });

    expect(result.current).toEqual({
      k8s: expect.any(Object),
      s3: expect.any(Object),
      pipelines: expect.any(Object),
    });
  });

  it('should preserve the shared API object when rerendered', () => {
    const { result, rerender } = renderHook(() => useAutoXApi(), {
      wrapper: createWrapper('/automl'),
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

  it('should isolate nested providers by configuration', () => {
    const { result } = renderHook(() => useAutoXApi(), {
      wrapper: ({ children }) => (
        <AutoXApiProvider apiPrefix="/outer" bffApiVersion="v1">
          <AutoXApiProvider apiPrefix="/inner" bffApiVersion="v1">
            {children}
          </AutoXApiProvider>
        </AutoXApiProvider>
      ),
    });

    expect(result.current).toEqual({
      k8s: expect.any(Object),
      s3: expect.any(Object),
      pipelines: expect.any(Object),
    });
  });
});
