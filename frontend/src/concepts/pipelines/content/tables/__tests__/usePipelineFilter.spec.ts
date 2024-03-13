import { act } from '@testing-library/react';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
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
