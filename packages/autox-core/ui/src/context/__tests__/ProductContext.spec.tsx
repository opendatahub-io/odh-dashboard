import React from 'react';
import { renderHook } from '@testing-library/react';
import { handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import { useProductContext, ProductContextProvider, type ProductContextProviderProps } from '..';

jest.mock('mod-arch-core', () => ({
  handleRestFailures: jest.fn((promise: Promise<unknown>) => promise),
  isModArchResponse: jest.fn(),
  restGET: jest.fn(),
}));

const mockHandleRestFailures = jest.mocked(handleRestFailures);
const mockIsModArchResponse = jest.mocked(isModArchResponse);
const mockRestGET = jest.mocked(restGET);

const createProps = (
  overrides: Partial<ProductContextProviderProps> = {},
): ProductContextProviderProps => ({
  product: 'automl',
  apiPrefix: '/automl',
  bffApiVersion: 'v1',
  parseErrorStatus: () => undefined,
  ...overrides,
});

const createWrapper = (props: ProductContextProviderProps) =>
  function Wrapper({ children }: React.PropsWithChildren) {
    return <ProductContextProvider {...props}>{children}</ProductContextProvider>;
  };

describe('ProductContextProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleRestFailures.mockImplementation((promise) => promise);
  });

  it('should provide product configuration, strategies, and URL-bound clients', async () => {
    const parseErrorStatus = jest.fn().mockReturnValue(404);
    const { result } = renderHook(() => useProductContext(), {
      wrapper: createWrapper(createProps({ parseErrorStatus })),
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        product: 'automl',
        apiPrefix: '/automl',
        bffApiVersion: 'v1',
        parseErrorStatus,
        api: {
          k8s: expect.any(Object),
          s3: expect.any(Object),
          pipelines: expect.any(Object),
        },
      }),
    );

    // eslint-disable-next-line camelcase
    mockRestGET.mockResolvedValue({ data: { run_id: 'run-1' } });
    mockIsModArchResponse.mockReturnValue(true);

    await expect(
      result.current.api.pipelines.getPipelineRunFromBFF('', 'run-1', 'namespace'),
      // eslint-disable-next-line camelcase
    ).resolves.toEqual({ run_id: 'run-1' });
    expect(mockRestGET).toHaveBeenCalledWith(
      '',
      '/automl/api/v1/pipeline-runs/run-1',
      { namespace: 'namespace' },
      {},
    );
  });

  it('should memoize the context value when configuration is unchanged', () => {
    const props = createProps();
    const { result, rerender } = renderHook(() => useProductContext(), {
      wrapper: createWrapper(props),
    });
    const initialValue = result.current;

    rerender();

    expect(result.current).toBe(initialValue);
    expect(mockRestGET).not.toHaveBeenCalled();
  });

  it('should throw clearly when used without a provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      expect(() => renderHook(() => useProductContext())).toThrow(
        'useProductContext must be used within a ProductContextProvider',
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it('should isolate nested providers', () => {
    const outer = createProps({ product: 'automl', apiPrefix: '/outer' });
    const inner = createProps({ product: 'autorag', apiPrefix: '/inner' });

    const { result: outerResult } = renderHook(() => useProductContext(), {
      wrapper: createWrapper(outer),
    });
    const { result: innerResult } = renderHook(() => useProductContext(), {
      wrapper: ({ children }) => (
        <ProductContextProvider {...outer}>
          <ProductContextProvider {...inner}>{children}</ProductContextProvider>
        </ProductContextProvider>
      ),
    });

    expect(outerResult.current.product).toBe('automl');
    expect(outerResult.current.apiPrefix).toBe('/outer');
    expect(innerResult.current.product).toBe('autorag');
    expect(innerResult.current.apiPrefix).toBe('/inner');
    expect(innerResult.current.api.pipelines).not.toBe(outerResult.current.api.pipelines);
  });
});
