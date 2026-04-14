/* eslint-disable camelcase */
import React, { act } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import { buildMockExperimentKF, buildMockPipelineVersion } from '#~/__mocks__';
import usePipelineFilter, {
  FilterOptions,
  usePipelineFilterSearchParams,
} from '#~/concepts/pipelines/content/tables/usePipelineFilter';
import { PipelinesFilterOp } from '#~/concepts/pipelines/kfTypes';
import { PipelineRunExperimentsContext } from '#~/pages/pipelines/global/runs/PipelineRunExperimentsContext';
import { PipelineRunVersionsContext } from '#~/pages/pipelines/global/runs/PipelineRunVersionsContext';

describe('usePipelineFilter', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
  );

  it('should update filter data', () => {
    const renderResult = renderHook(() => usePipelineFilter(jest.fn()), { wrapper });
    expect(renderResult.result.current.filterData).toEqual({
      [FilterOptions.NAME]: '',
      [FilterOptions.CREATED_AT]: '',
      [FilterOptions.STATUS]: '',
      [FilterOptions.RUN_GROUP]: undefined,
      [FilterOptions.PIPELINE_VERSION]: undefined,
      [FilterOptions.MLFLOW_EXPERIMENT]: '',
    });

    act(() => {
      renderResult.result.current.onFilterUpdate(FilterOptions.NAME, 'test');
    });
    expect(renderResult.result.current.filterData).toEqual({
      [FilterOptions.NAME]: 'test',
      [FilterOptions.CREATED_AT]: '',
      [FilterOptions.STATUS]: '',
      [FilterOptions.RUN_GROUP]: undefined,
      [FilterOptions.PIPELINE_VERSION]: undefined,
      [FilterOptions.MLFLOW_EXPERIMENT]: '',
    });

    act(() => {
      renderResult.result.current.onClearFilters();
    });
    expect(renderResult.result.current.filterData).toEqual({
      [FilterOptions.NAME]: '',
      [FilterOptions.CREATED_AT]: '',
      [FilterOptions.STATUS]: '',
      [FilterOptions.RUN_GROUP]: undefined,
      [FilterOptions.PIPELINE_VERSION]: undefined,
      [FilterOptions.MLFLOW_EXPERIMENT]: '',
    });
  });

  it('should notify callback on filter data change', () => {
    const setFilterMock = jest.fn();
    const renderResult = renderHook(() => usePipelineFilter(setFilterMock), { wrapper });
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
    renderHook(() => usePipelineFilter(setFilterMock), { wrapper });
    jest.runAllTimers();
    expect(setFilterMock).toHaveBeenCalledTimes(1);
  });

  it('should notify name change on debounce', () => {
    jest.useFakeTimers();
    const setFilterMock = jest.fn();
    const renderResult = renderHook(() => usePipelineFilter(setFilterMock), { wrapper });
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
    const renderResult = renderHook(() => usePipelineFilter(jest.fn()), { wrapper });
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

describe('usePipelineFilterSearchParams', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize filters from URL search params', () => {
    const setFilterMock = jest.fn();
    const { result } = renderHook(() => usePipelineFilterSearchParams(setFilterMock), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter
          initialEntries={[
            '/?name=test&status=success&create_at=2024-11-21&experiment=test-experiment&pipeline_version=test-version',
          ]}
        >
          {children}
        </MemoryRouter>
      ),
    });

    expect(result.current.filterData).toEqual({
      [FilterOptions.NAME]: 'test',
      [FilterOptions.CREATED_AT]: '2024-11-21',
      [FilterOptions.STATUS]: 'success',
      [FilterOptions.RUN_GROUP]: { value: 'test-experiment', label: 'Loading...' },
      [FilterOptions.PIPELINE_VERSION]: 'test-version',
      [FilterOptions.MLFLOW_EXPERIMENT]: '',
    });
  });

  it('should set display name for experiments and pipeline versions if they are in the context', () => {
    const setFilterMock = jest.fn();
    const { result } = renderHook(() => usePipelineFilterSearchParams(setFilterMock), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <PipelineRunVersionsContext.Provider
          value={{
            versions: [
              buildMockPipelineVersion({
                pipeline_version_id: 'test-version',
                display_name: 'Test Version',
              }),
            ],
            loaded: true,
          }}
        >
          <PipelineRunExperimentsContext.Provider
            value={{
              experiments: [
                buildMockExperimentKF({
                  experiment_id: 'test-experiment',
                  display_name: 'Test Experiment',
                }),
              ],
              loaded: true,
            }}
          >
            <MemoryRouter
              initialEntries={[
                '/?name=test&status=success&create_at=2024-11-21&experiment=test-experiment&pipeline_version=test-version',
              ]}
            >
              {children}
            </MemoryRouter>
          </PipelineRunExperimentsContext.Provider>
        </PipelineRunVersionsContext.Provider>
      ),
    });

    expect(result.current.filterData).toEqual({
      [FilterOptions.NAME]: 'test',
      [FilterOptions.CREATED_AT]: '2024-11-21',
      [FilterOptions.STATUS]: 'success',
      [FilterOptions.RUN_GROUP]: {
        label: 'Test Experiment',
        value: 'test-experiment',
      },
      [FilterOptions.PIPELINE_VERSION]: {
        label: 'Test Version',
        value: 'test-version',
      },
      [FilterOptions.MLFLOW_EXPERIMENT]: '',
    });
  });

  it('should not set anything if the search param keys do not match the options', () => {
    const setFilterMock = jest.fn();
    const { result } = renderHook(() => usePipelineFilterSearchParams(setFilterMock), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={['/?test=invalid&test2=invalid2']}>{children}</MemoryRouter>
      ),
    });

    expect(result.current.filterData).toEqual({
      [FilterOptions.NAME]: '',
      [FilterOptions.CREATED_AT]: '',
      [FilterOptions.STATUS]: '',
      [FilterOptions.RUN_GROUP]: undefined,
      [FilterOptions.PIPELINE_VERSION]: undefined,
      [FilterOptions.MLFLOW_EXPERIMENT]: '',
    });
  });

  it('should update URL when filter changes', () => {
    jest.useFakeTimers();
    const setFilterMock = jest.fn();
    let currentSearch = '';

    const { result } = renderHook(() => usePipelineFilterSearchParams(setFilterMock), {
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
    window.history.pushState({}, '', '/?name=test&status=success');

    const { result } = renderHook(() => usePipelineFilterSearchParams(setFilterMock), {
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

    expect(currentSearch).toBe('?name=test&status=success');

    act(() => {
      result.current.onClearFilters();
    });

    expect(currentSearch).toBe('');
  });

  it('should remove legacy experiment param when run group filter is updated', () => {
    const setFilterMock = jest.fn();
    let currentSearch = '';
    window.history.pushState({}, '', '/?experiment=legacy-exp');

    const { result } = renderHook(() => usePipelineFilterSearchParams(setFilterMock), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/?experiment=legacy-exp']}>
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
      result.current.onFilterUpdate(FilterOptions.RUN_GROUP, 'new-exp');
    });

    const params = new URLSearchParams(currentSearch);
    expect(params.get('experiment')).toBeNull();
    expect(params.get(FilterOptions.RUN_GROUP)).toBe('new-exp');
  });

  it('should preserve other URL params when updating filters', () => {
    const setFilterMock = jest.fn();
    let currentSearch = '';
    window.history.pushState({}, '', '/?otherParam=value');

    const { result } = renderHook(() => usePipelineFilterSearchParams(setFilterMock), {
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

    expect(currentSearch).toBe('?otherParam=value');

    act(() => {
      result.current.onFilterUpdate(FilterOptions.NAME, 'test');
    });

    act(() => {
      jest.runAllTimers();
    });

    expect(currentSearch).toBe('?otherParam=value&name=test');
  });

  describe('run group predicate resolution', () => {
    const experimentAlpha = buildMockExperimentKF({
      experiment_id: 'exp-alpha',
      display_name: 'Alpha Test',
    });
    const experimentGamma = buildMockExperimentKF({
      experiment_id: 'exp-gamma',
      display_name: 'Gamma',
    });

    const versionsContextValue = { versions: [] as never[], loaded: true };
    const experimentsContextValue = {
      experiments: [experimentAlpha, experimentGamma],
      loaded: true,
    };

    const wrapperWithExperiments = (url: string) => {
      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <PipelineRunVersionsContext.Provider value={versionsContextValue}>
          <PipelineRunExperimentsContext.Provider value={experimentsContextValue}>
            <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
          </PipelineRunExperimentsContext.Provider>
        </PipelineRunVersionsContext.Provider>
      );
      return Wrapper;
    };

    it('should produce EQUALS predicate when run group filter matches an experiment by ID', () => {
      const setFilterMock = jest.fn();
      renderHook(() => usePipelineFilterSearchParams(setFilterMock), {
        wrapper: wrapperWithExperiments('/?run_group=exp-gamma'),
      });

      jest.runAllTimers();

      expect(setFilterMock).toHaveBeenLastCalledWith({
        predicates: expect.arrayContaining([
          {
            key: 'experiment_id',
            operation: PipelinesFilterOp.EQUALS,
            string_value: 'exp-gamma',
          },
        ]),
      });
    });

    it('should use exact experiment ID for legacy ?experiment= deep links', () => {
      const setFilterMock = jest.fn();
      renderHook(() => usePipelineFilterSearchParams(setFilterMock), {
        wrapper: wrapperWithExperiments('/?experiment=exp-alpha'),
      });

      jest.runAllTimers();

      expect(setFilterMock).toHaveBeenLastCalledWith({
        predicates: expect.arrayContaining([
          {
            key: 'experiment_id',
            operation: PipelinesFilterOp.EQUALS,
            string_value: 'exp-alpha',
          },
        ]),
      });
    });

    it('should preserve exact legacy experiment ID before experiments load', () => {
      const setFilterMock = jest.fn();
      const wrapperWithLoadingExperiments = ({ children }: { children: React.ReactNode }) => (
        <PipelineRunVersionsContext.Provider value={versionsContextValue}>
          <PipelineRunExperimentsContext.Provider value={{ experiments: [], loaded: false }}>
            <MemoryRouter initialEntries={['/?experiment=exp-alpha']}>{children}</MemoryRouter>
          </PipelineRunExperimentsContext.Provider>
        </PipelineRunVersionsContext.Provider>
      );

      renderHook(() => usePipelineFilterSearchParams(setFilterMock), {
        wrapper: wrapperWithLoadingExperiments,
      });

      jest.runAllTimers();

      expect(setFilterMock).toHaveBeenLastCalledWith({
        predicates: expect.arrayContaining([
          {
            key: 'experiment_id',
            operation: PipelinesFilterOp.EQUALS,
            string_value: 'exp-alpha',
          },
        ]),
      });
    });
  });

  it('should ignore mlflow experiment URL param when feature is unavailable', () => {
    const setFilterMock = jest.fn();
    const { result } = renderHook(() => usePipelineFilterSearchParams(setFilterMock), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={['/?mlflow_experiment=my-mlflow-exp']}>
          {children}
        </MemoryRouter>
      ),
    });

    jest.runAllTimers();

    expect(result.current.filterData[FilterOptions.MLFLOW_EXPERIMENT]).toBe('');

    const lastCall = setFilterMock.mock.calls[setFilterMock.mock.calls.length - 1][0];
    const predicateKeys = (lastCall?.predicates ?? []).map((p: { key: string }) => p.key);
    expect(predicateKeys).not.toContain('mlflow_experiment');
  });
});
