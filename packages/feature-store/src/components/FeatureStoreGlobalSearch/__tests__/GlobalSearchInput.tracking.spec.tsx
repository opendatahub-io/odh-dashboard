import * as React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import useFeatureStoreProjects from '../../../apiHooks/useFeatureStoreProjects';
import { TrackingProvider } from '../../../__tests__/unit/testUtils/TrackingProvider';
import { GlobalSearchInput } from '../GlobalSearchInput';
import { DEFAULT_PROJECT_LIST } from '../../../const';

jest.mock('../../../apiHooks/useFeatureStoreProjects');

const renderSearch = (
  trackEvent: jest.Mock,
  isLoading: boolean,
  totalCount = 7,
  isDetailsPage = false,
) => (
  <TrackingProvider trackEvent={trackEvent}>
    <MemoryRouter>
      <GlobalSearchInput
        data={[
          {
            id: 'private-id',
            title: 'private-title',
            description: 'private-description',
            category: 'Entities',
            type: 'entity',
            project: 'private-project',
          },
        ]}
        isLoading={isLoading}
        totalCount={totalCount}
        isDetailsPage={isDetailsPage}
      />
    </MemoryRouter>
  </TrackingProvider>
);

describe('GlobalSearchInput tracking', () => {
  beforeEach(() => {
    // Loading transitions are driven by props; the search debounce must not run on wall time.
    jest.useFakeTimers();
    jest.mocked(useFeatureStoreProjects).mockReturnValue({
      data: DEFAULT_PROJECT_LIST,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should emit on loading completion with a query, not on typing or unrelated rerenders', () => {
    const trackEvent = jest.fn();
    const replacement = jest.fn();
    const { rerender } = render(renderSearch(trackEvent, false));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'private-query' } });
    expect(trackEvent).not.toHaveBeenCalled();
    rerender(renderSearch(trackEvent, true));
    rerender(renderSearch(trackEvent, false));
    rerender(renderSearch(trackEvent, false, 9));
    expect(trackEvent.mock.calls).toEqual([
      ['Feature Store Search Performed', { resultCount: 7, pageType: 'list' }],
    ]);
    rerender(renderSearch(replacement, false, 9));
    expect(replacement).not.toHaveBeenCalled();
    rerender(renderSearch(replacement, true, 0, true));
    rerender(renderSearch(replacement, false, 0, true));
    expect(replacement.mock.calls).toEqual([
      ['Feature Store Search Performed', { resultCount: 1, pageType: 'detail' }],
    ]);
    fireEvent.change(input, { target: { value: '' } });
    rerender(renderSearch(replacement, true));
    rerender(renderSearch(replacement, false));
    expect(replacement).toHaveBeenCalledTimes(1);
  });

  it('should not emit for an empty or whitespace-only query on completion', () => {
    const trackEvent = jest.fn();
    const { rerender } = render(renderSearch(trackEvent, true));
    rerender(renderSearch(trackEvent, false));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });
    rerender(renderSearch(trackEvent, true));
    rerender(renderSearch(trackEvent, false));
    expect(trackEvent).not.toHaveBeenCalled();
  });
});
