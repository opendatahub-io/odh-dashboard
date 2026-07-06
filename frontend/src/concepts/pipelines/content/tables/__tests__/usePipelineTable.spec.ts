import { act } from 'react';
import * as React from 'react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import createUsePipelineTable from '#~/concepts/pipelines/content/tables/usePipelineTable';
import { PipelineCoreResourceKF, PipelineRunKF } from '#~/concepts/pipelines/kfTypes';
import { PipelineListPaged, PipelineOptions } from '#~/concepts/pipelines/types';
import { FetchState } from '#~/utilities/useFetchState';

describe('usePipelineTable', () => {
  it('should indicate initialLoaded after first load', async () => {
    let setInternalStateFn: (
      state: FetchState<PipelineListPaged<PipelineCoreResourceKF>>,
    ) => void = () => {
      // empty
    };
    const useMock = jest.fn((() => {
      const [internalState, setInternalState] = React.useState<
        FetchState<PipelineListPaged<PipelineCoreResourceKF>>
      >([{ totalSize: 0, items: [] }, false, undefined, jest.fn()]);
      setInternalStateFn = setInternalState;
      return internalState;
    }) as unknown as (options: PipelineOptions) => FetchState<PipelineListPaged<PipelineCoreResourceKF | PipelineRunKF>>);

    // initialLoaded starts as `false`
    const renderResult = testHook(createUsePipelineTable(useMock))();
    expect(renderResult.result.current[0][1]).toBe(false);
    expect(renderResult.result.current[1].initialLoaded).toBe(false);

    // initialLoaded should update to `true` when data is first loaded
    act(() => setInternalStateFn([{ totalSize: 0, items: [] }, true, undefined, jest.fn()]));
    expect(renderResult.result.current[0][1]).toBe(true);
    expect(renderResult.result.current[1].initialLoaded).toBe(true);

    // even when data is loading again, initialLoaded should be `true`
    act(() => setInternalStateFn([{ totalSize: 0, items: [] }, false, undefined, jest.fn()]));
    expect(renderResult.result.current[0][1]).toBe(false);
    expect(renderResult.result.current[1].initialLoaded).toBe(true);
  });

  it('should call inner hook with query params', () => {
    const useMock = jest.fn((() => [{}, false]) as unknown as (
      options: PipelineOptions,
    ) => FetchState<PipelineListPaged<PipelineCoreResourceKF | PipelineRunKF>>);

    const renderResult = testHook(createUsePipelineTable(useMock))();

    expect(useMock).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
      sortField: undefined,
      sortDirection: undefined,
      filter: undefined,
    });

    useMock.mockClear();
    act(() => renderResult.result.current[1].setPage(2));
    expect(useMock).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));

    // set page should reset page
    useMock.mockClear();
    act(() => {
      renderResult.result.current[1].setPage(2);
      renderResult.result.current[1].setPageSize(20);
    });
    expect(useMock).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 20 }));

    // set sort field should reset page
    useMock.mockClear();
    act(() => {
      renderResult.result.current[1].setPage(2);
      renderResult.result.current[1].setSortField('name');
    });
    expect(useMock).toHaveBeenCalledWith(expect.objectContaining({ page: 1, sortField: 'name' }));

    // set sort direction should reset page
    useMock.mockClear();
    act(() => {
      renderResult.result.current[1].setPage(2);
      renderResult.result.current[1].setSortDirection('asc');
    });
    expect(useMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, sortDirection: 'asc' }),
    );

    // set field should reset page
    useMock.mockClear();
    act(() => {
      renderResult.result.current[1].setPage(2);
      renderResult.result.current[1].setFilter({});
    });
    expect(useMock).toHaveBeenCalledWith(expect.objectContaining({ page: 1, filter: {} }));
  });

  it('should prevent page changes when a limit is set', () => {
    const useMock = jest.fn((() => [{}, false]) as unknown as (
      options: PipelineOptions,
    ) => FetchState<PipelineListPaged<PipelineCoreResourceKF | PipelineRunKF>>);

    const renderResult = testHook(createUsePipelineTable(useMock))(25);

    expect(useMock).toHaveBeenCalledWith({
      page: 1,
      pageSize: 25,
      sortField: undefined,
      sortDirection: undefined,
      filter: undefined,
    });

    useMock.mockClear();
    act(() => {
      renderResult.result.current[1].setPageSize(20);
      renderResult.result.current[1].setPage(2);
    });
    // updates to page and page size should not produce an update
    expect(useMock).toHaveBeenCalledTimes(0);
  });

  it('should provide stable callbacks', async () => {
    const useMock = jest.fn((() => [{}, false]) as unknown as (
      options: PipelineOptions,
    ) => FetchState<PipelineListPaged<PipelineCoreResourceKF | PipelineRunKF>>);

    const renderResult = testHook(createUsePipelineTable(useMock))();

    // perform any update to trigger a rerender
    act(() => {
      renderResult.result.current[1].setPage(2);
    });
    expect(renderResult).hookToBeStable([
      false,
      {
        setPage: true,
        setPageSize: true,
        setSortField: true,
        setSortDirection: true,
        setFilter: true,
      },
    ]);
  });
});
