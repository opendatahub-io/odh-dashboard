import * as React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import QuotaUsageNavPanel from '../QuotaUsageNavPanel';
import { createTrackingWrapper } from '../../../__tests__/unit/testUtils/TrackingProvider';
import { buildCohortOnlyQuotaTree } from '../../../utils/__tests__/quotaHierarchyFixtures';

const mockTrackEvent = jest.fn();
const mockTrackPageEvent = jest.fn();
const TrackingWrapper = createTrackingWrapper(mockTrackEvent, mockTrackPageEvent);

const renderNav = () => {
  const onSelectionChange = jest.fn();
  const element = (
    <QuotaUsageNavPanel
      tree={buildCohortOnlyQuotaTree()}
      onSelectionChange={onSelectionChange}
      tabLoadedAt={{ current: 0 }}
    />
  );
  return { ...render(element, { wrapper: TrackingWrapper }), element, onSelectionChange };
};

describe('QuotaUsageNavPanel tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(10_000);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should preserve expand, collapse, and selection payloads without render events', () => {
    const { rerender, element, onSelectionChange } = renderNav();
    rerender(element);
    expect(mockTrackEvent).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('quota-usage-collapse-all'));
    fireEvent.click(screen.getByTestId('quota-usage-expand-all'));
    fireEvent.click(screen.getByTestId('gpuaas-quota-usage-tree-node-prod-serving'));
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent.mock.calls).toEqual([
      ['Infrastructure Cohort Tree Expand Collapse All Selected', { isExpanded: false }],
      [
        'Infrastructure Quota Usage Tab Interacted',
        { interactionType: 'expand-collapse-all', secondsSinceTabLoad: 10 },
      ],
      ['Infrastructure Cohort Tree Expand Collapse All Selected', { isExpanded: true }],
      [
        'Infrastructure Quota Usage Tab Interacted',
        { interactionType: 'expand-collapse-all', secondsSinceTabLoad: 10 },
      ],
      [
        'Infrastructure Quota Usage Tab Interacted',
        { interactionType: 'tree-select', secondsSinceTabLoad: 10 },
      ],
    ]);
    expect(mockTrackPageEvent).not.toHaveBeenCalled();
  });

  it('should debounce search and preserve only match counts, including empty results', () => {
    renderNav();
    const input = screen.getByTestId('quota-usage-nav-search');
    fireEvent.change(input, { target: { value: 'prod' } });
    act(() => jest.advanceTimersByTime(200));
    fireEvent.change(input, { target: { value: 'private-query' } });
    act(() => jest.advanceTimersByTime(299));
    expect(mockTrackEvent).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(1));
    expect(mockTrackEvent.mock.calls).toEqual([
      ['Infrastructure Cohort Tree Search Applied', { matchCount: 0, isEmptyResult: true }],
      [
        'Infrastructure Quota Usage Tab Interacted',
        { interactionType: 'tree-search', secondsSinceTabLoad: 11 },
      ],
    ]);
  });

  it('should cancel pending search on clear and retain the existing clear event pair', () => {
    renderNav();
    fireEvent.change(screen.getByTestId('quota-usage-nav-search'), { target: { value: 'prod' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    act(() => jest.advanceTimersByTime(300));
    expect(mockTrackEvent.mock.calls).toEqual([
      ['Infrastructure Cohort Tree Search Applied', { matchCount: 1, isEmptyResult: false }],
      [
        'Infrastructure Quota Usage Tab Interacted',
        { interactionType: 'tree-search', secondsSinceTabLoad: 10 },
      ],
    ]);
  });

  it('should cancel pending search on unmount', () => {
    const { unmount } = renderNav();
    fireEvent.change(screen.getByTestId('quota-usage-nav-search'), { target: { value: 'prod' } });
    unmount();
    act(() => jest.advanceTimersByTime(300));
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});
