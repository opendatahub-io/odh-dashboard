import { act } from 'react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import useFilters from '#~/utilities/useFilters';

describe('useFilters', () => {
  const initialFilterData = { name: '', status: undefined };

  it('should initialize with the provided initial filter data', () => {
    const renderResult = testHook(useFilters)(initialFilterData);

    expect(renderResult).hookToHaveUpdateCount(1);
    expect(renderResult.result.current.filterData).toStrictEqual(initialFilterData);
  });

  it('should update a single filter key on onFilterUpdate', () => {
    const renderResult = testHook(useFilters)(initialFilterData);

    act(() => {
      renderResult.result.current.onFilterUpdate('name', 'my-resource');
    });
    renderResult.rerender(initialFilterData);

    expect(renderResult.result.current.filterData).toStrictEqual({
      name: 'my-resource',
      status: undefined,
    });

    act(() => {
      renderResult.result.current.onFilterUpdate('status', { label: 'Active', value: 'active' });
    });
    renderResult.rerender(initialFilterData);

    expect(renderResult.result.current.filterData).toStrictEqual({
      name: 'my-resource',
      status: { label: 'Active', value: 'active' },
    });
  });

  it('should reset filterData to the initial value on onClearFilters', () => {
    const renderResult = testHook(useFilters)(initialFilterData);

    act(() => {
      renderResult.result.current.onFilterUpdate('name', 'my-resource');
    });
    renderResult.rerender(initialFilterData);

    act(() => {
      renderResult.result.current.onClearFilters();
    });
    renderResult.rerender(initialFilterData);

    expect(renderResult.result.current.filterData).toStrictEqual(initialFilterData);
  });

  it('should keep onFilterUpdate and onClearFilters stable across re-renders', () => {
    const renderResult = testHook(useFilters)(initialFilterData);
    const { onFilterUpdate, onClearFilters } = renderResult.result.current;

    renderResult.rerender(initialFilterData);

    expect(renderResult.result.current.onFilterUpdate).toBe(onFilterUpdate);
    expect(renderResult.result.current.onClearFilters).toBe(onClearFilters);
  });
});
