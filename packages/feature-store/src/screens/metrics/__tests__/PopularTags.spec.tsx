/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { TrackingProvider } from '../../../__tests__/unit/testUtils/TrackingProvider';
import { mockPopularTags } from '../../../__mocks__/mockMetrics';
import useMetricsPopularTags from '../../../apiHooks/useMetricsPopularTags';
import { PopularTagsResponse } from '../../../types/metrics';
import PopularTags from '../PopularTags';

jest.mock('../../../apiHooks/useMetricsPopularTags');

const mockUseMetricsPopularTags = jest.mocked(useMetricsPopularTags);

const renderPopularTags = (props: { project?: string; limit?: number } = {}) =>
  render(
    <TrackingProvider>
      <MemoryRouter>
        <PopularTags project={props.project} limit={props.limit ?? 4} />
      </MemoryRouter>
    </TrackingProvider>,
  );

const setupHook = ({
  data = mockPopularTags(),
  loaded = true,
  error,
}: { data?: PopularTagsResponse; loaded?: boolean; error?: Error } = {}) => {
  mockUseMetricsPopularTags.mockReturnValue({
    data,
    loaded,
    error,
    refresh: jest.fn(),
  });
};

describe('PopularTags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHook();
  });

  it('renders the section title', () => {
    renderPopularTags();

    expect(screen.getByTestId('popular-tags-title')).toHaveTextContent(
      'Feature views using popular tags',
    );
  });

  it('renders skeletons while the tags are loading', () => {
    setupHook({ loaded: false, data: mockPopularTags({ popular_tags: [] }) });

    const { container } = renderPopularTags();

    expect(
      screen.queryByTestId('feature-store-popular-tag-card-team-driver_performance'),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('popular-tags-empty-state-title')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    // PF Skeleton renders a bare div with the pf-v6-c-skeleton class and no role, so a class
    // query is the only way to assert the placeholders are actually there.
    expect(container.querySelectorAll('.pf-v6-c-skeleton').length).toBeGreaterThan(0);
    // The loading branch hardcodes 4 placeholder cards regardless of the limit prop.
    expect(container.querySelectorAll('.pf-v6-c-card')).toHaveLength(4);
  });

  it('renders the access denied state when the request fails', () => {
    setupHook({
      error: new Error('forbidden'),
      loaded: false,
      data: mockPopularTags({ popular_tags: [] }),
    });

    renderPopularTags();

    expect(screen.getByTestId('error-loading-popular-tags')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders the empty state when there are no popular tags', () => {
    setupHook({ data: mockPopularTags({ popular_tags: [] }) });

    renderPopularTags();

    expect(screen.getByTestId('popular-tags-empty-state-title')).toHaveTextContent(
      'No feature views yet',
    );
  });

  it('renders a card per popular tag with its feature views', () => {
    renderPopularTags();

    const card = screen.getByTestId('feature-store-popular-tag-card-team-driver_performance');
    expect(within(card).getByText('team=driver_performance')).toBeInTheDocument();
    expect(
      within(card).getByRole('link', { name: /driver_hourly_stats feature view/ }),
    ).toHaveAttribute(
      'href',
      '/develop-train/feature-store/feature-views/rbac/driver_hourly_stats',
    );
    expect(within(card).getByRole('link', { name: /View all/ })).toHaveTextContent('View all (2)');
  });

  it('requests the given project and limit from the API hook', () => {
    renderPopularTags({ project: 'credit_scoring_local', limit: 2 });

    expect(mockUseMetricsPopularTags).toHaveBeenCalledWith({
      project: 'credit_scoring_local',
      limit: 2,
    });
  });
});
