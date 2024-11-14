import React, { act } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { renderHook, testHook } from '~/__tests__/unit/testUtils/hooks';
import usePipelineFilter, {
  FilterOptions,
} from '~/concepts/pipelines/content/tables/usePipelineFilter';
import { PipelinesFilterOp } from '~/concepts/pipelines/kfTypes';

describe('usePipelineFilter', () => {
  it('should update filter data', () => {
    const renderResult = testHook(usePipelineFilter)(jest.fn());
    expect(renderResult.result.current.filterData).toEqual({
      [FilterOptions.NAME]: '',
      [FilterOptions.CREATED_AT]: '',
      [FilterOptions.STATUS]: '',
      [FilterOptions.EXPERIMENT]: undefined,
      [FilterOptions.PIPELINE_VERSION]: '',
    });

    act(() => {
      renderResult.result.current.onFilterUpdate(FilterOptions.NAME, 'test');
    });
    expect(renderResult.result.current.filterData).toEqual({
      [FilterOptions.NAME]: 'test',
      [FilterOptions.CREATED_AT]: '',
      [FilterOptions.STATUS]: '',
      [FilterOptions.EXPERIMENT]: undefined,
      [FilterOptions.PIPELINE_VERSION]: '',
    });

    act(() => {
      renderResult.result.current.onClearFilters();
    });
    expect(renderResult.result.current.filterData).toEqual({
      [FilterOptions.NAME]: '',
      [FilterOptions.CREATED_AT]: '',
      [FilterOptions.STATUS]: '',
      [FilterOptions.EXPERIMENT]: undefined,
      [FilterOptions.PIPELINE_VERSION]: '',
    });
  });

  it('should notify callback on filter data change', () => {
    const setFilterMock = jest.fn();
    const renderResult = testHook(usePipelineFilter)(setFilterMock);
    setFilterMock.mockClear();
    act(() => {
      renderResult.result.current.onFilterUpdate(FilterOptions.STATUS, 'success');
    });
    expect(setFilterMock).toHaveBeenCalledTimes(1);
    expect(setFilterMock).toHaveBeenCalledWith({
      predicates: [
        {
          key: 'state',
          operation: PipelinesFilterOp.EQUALS,
          // eslint-disable-next-line camelcase
          string_value: 'success',
        },
      ],
    });
  });

  it('should notify only once on first render', () => {
    jest.useFakeTimers();
    const setFilterMock = jest.fn();
    testHook(usePipelineFilter)(setFilterMock);
    jest.runAllTimers();
    expect(setFilterMock).toHaveBeenCalledTimes(1);
  });

  it('should notify name change on debounce', () => {
    jest.useFakeTimers();
    const setFilterMock = jest.fn();
    const renderResult = testHook(usePipelineFilter)(setFilterMock);
    setFilterMock.mockClear();
    act(() => {
      renderResult.result.current.onFilterUpdate(FilterOptions.NAME, 'f');
    });
    act(() => {
      renderResult.result.current.onFilterUpdate(FilterOptions.NAME, 'foo');
    });
    jest.runAllTimers();
    expect(setFilterMock).toHaveBeenCalledTimes(1);
    expect(setFilterMock).toHaveBeenCalledWith({
      predicates: [
        {
          key: 'name',
          operation: PipelinesFilterOp.IS_SUBSTRING,
          // eslint-disable-next-line camelcase
          string_value: 'foo',
        },
      ],
    });
  });

  it('should provide stable callbacks', async () => {
    const renderResult = testHook(usePipelineFilter)(jest.fn());
    act(() => {
      renderResult.result.current.onFilterUpdate(FilterOptions.NAME, 'test');
    });
    expect(renderResult).hookToBeStable({
      onClearFilters: true,
      onFilterUpdate: true,
    });
  });
});

const LocationDisplay = ({ setSearch }: { setSearch: (search: string) => void }) => {
  const location = useLocation();
  React.useEffect(() => {
    setSearch(location.search);
  }, [location.search, setSearch]);
  return null;
};

describe('usePipelineFilter with URL persistence', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize filters from URL search params when persistInUrl is true', () => {
    const setFilterMock = jest.fn();
    const { result } = renderHook(() => usePipelineFilter(setFilterMock, undefined, true), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={['/?name=test&status=success']}>{children}</MemoryRouter>
      ),
    });

    expect(result.current.filterData).toEqual({
      [FilterOptions.NAME]: 'test',
      [FilterOptions.CREATED_AT]: '',
      [FilterOptions.STATUS]: 'success',
      [FilterOptions.EXPERIMENT]: undefined,
      [FilterOptions.PIPELINE_VERSION]: '',
    });
  });

  it('should update URL when filters change and persistInUrl is true', () => {
    jest.useFakeTimers();
    const setFilterMock = jest.fn();
    let currentSearch = '';

    const { result } = renderHook(() => usePipelineFilter(setFilterMock, undefined, true), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/']}>
          {children}
          <LocationDisplay
            setSearch={(search) => {
              currentSearch = search;
            }}
          />
        </MemoryRouter>
      ),
    });

    act(() => {
      result.current.onFilterUpdate(FilterOptions.NAME, 'test');
    });

    act(() => {
      jest.runAllTimers();
    });

    const firstParams = new URLSearchParams(currentSearch);
    expect(firstParams.get('name')).toBe('test');

    act(() => {
      result.current.onFilterUpdate(FilterOptions.STATUS, 'success');
    });

    const secondParams = new URLSearchParams(currentSearch);
    expect(secondParams.get('name')).toBe('test');
    expect(secondParams.get('status')).toBe('success');
  });

  it('should clear URL params when filters are cleared', () => {
    const setFilterMock = jest.fn();
    let currentSearch = '';

    const { result } = renderHook(() => usePipelineFilter(setFilterMock, undefined, true), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/?name=test&status=success']}>
          {children}
          <LocationDisplay
            setSearch={(search) => {
              currentSearch = search;
            }}
          />
        </MemoryRouter>
      ),
    });

    act(() => {
      result.current.onClearFilters();
    });

    expect(currentSearch).toBe('');
  });

  it('should preserve other URL params when updating filters', () => {
    const setFilterMock = jest.fn();
    let currentSearch = '';

    const { result } = renderHook(() => usePipelineFilter(setFilterMock, undefined, true), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/?otherParam=value']}>
          {children}
          <LocationDisplay
            setSearch={(search) => {
              currentSearch = search;
            }}
          />
        </MemoryRouter>
      ),
    });

    act(() => {
      result.current.onFilterUpdate(FilterOptions.NAME, 'test');
    });

    act(() => {
      jest.runAllTimers();
    });

    expect(currentSearch).toBe('?otherParam=value&name=test');
  });

  it('should not update URL when persistInUrl is false', () => {
    jest.useFakeTimers();
    const setFilterMock = jest.fn();
    let currentSearch = '';

    const { result } = renderHook(() => usePipelineFilter(setFilterMock, undefined, false), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/']}>
          {children}
          <LocationDisplay
            setSearch={(search) => {
              currentSearch = search;
            }}
          />
        </MemoryRouter>
      ),
    });

    act(() => {
      result.current.onFilterUpdate(FilterOptions.NAME, 'test');
    });

    act(() => {
      jest.runAllTimers();
    });

    expect(currentSearch).toBe('');
  });
});
