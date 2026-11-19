/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { TrackingProvider } from '../../../__tests__/unit/testUtils/TrackingProvider';
import { mockRecentlyVisited } from '../../../__mocks__/mockMetrics';
import useRecentlyVisitedResources from '../../../apiHooks/useRecentlyVisitedResources';
import { RecentlyVisitedResponse } from '../../../types/metrics';
import RecentlyVisitedResources from '../RecentlyVisitedResources';

jest.mock('../../../apiHooks/useRecentlyVisitedResources');

const mockUseRecentlyVisitedResources = jest.mocked(useRecentlyVisitedResources);

const renderRecentlyVisited = (props: { project?: string; limit?: number } = {}) =>
  render(
    <TrackingProvider>
      <MemoryRouter>
        <RecentlyVisitedResources project={props.project} limit={props.limit} />
      </MemoryRouter>
    </TrackingProvider>,
  );

const setupHook = ({
  data = mockRecentlyVisited(),
  loaded = true,
  error,
}: { data?: RecentlyVisitedResponse; loaded?: boolean; error?: Error } = {}) => {
  mockUseRecentlyVisitedResources.mockReturnValue({
    data,
    loaded,
    error,
    refresh: jest.fn(),
  });
};

describe('RecentlyVisitedResources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHook();
  });

  it('renders a loading spinner while the visits are loading', () => {
    setupHook({ loaded: false, data: mockRecentlyVisited({ visits: [] }) });

    renderRecentlyVisited();

    expect(screen.getByLabelText('Loading recently viewed resources')).toBeInTheDocument();
    expect(screen.queryByTestId('recently-visited-resources-table')).not.toBeInTheDocument();
  });

  it('renders the error state when the request fails', () => {
    setupHook({
      error: new Error('forbidden'),
      loaded: false,
      data: mockRecentlyVisited({ visits: [] }),
    });

    renderRecentlyVisited();

    expect(screen.getByTestId('recently-visited-resources-error-state')).toBeInTheDocument();
    expect(screen.queryByLabelText('Loading recently viewed resources')).not.toBeInTheDocument();
  });

  it('renders the empty state when there are no visits', () => {
    setupHook({ data: mockRecentlyVisited({ visits: [] }) });

    renderRecentlyVisited();

    expect(screen.getByTestId('recently-visited-resources-empty-state-title')).toHaveTextContent(
      'No recently visited resources.',
    );
    expect(screen.queryByTestId('recently-visited-resources-table')).not.toBeInTheDocument();
  });

  it('renders a row per visit with a link to the resource', () => {
    setupHook({
      data: {
        visits: [
          {
            path: '/api/v1/entities/driver',
            timestamp: '2025-08-18T10:00:00.000000+00:00',
            project: 'rbac',
            user: 'anonymous',
            object: 'entities',
            object_name: 'driver',
            method: 'GET',
          },
          {
            path: '/api/v1/feature_views/transformed_conv_rate',
            timestamp: '2025-08-17T10:00:00.000000+00:00',
            project: 'rbac',
            user: 'anonymous',
            object: 'feature_views',
            object_name: 'transformed_conv_rate',
            method: 'GET',
          },
        ],
        pagination: { totalCount: 2 },
      },
    });

    renderRecentlyVisited();

    expect(screen.getByRole('columnheader', { name: 'Resource name' })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Go to driver entity in rbac project' }),
    ).toHaveAttribute('href', '/develop-train/feature-store/entities/rbac/driver');
    expect(
      screen.getByRole('link', {
        name: 'Go to transformed_conv_rate feature views in rbac project',
      }),
    ).toHaveAttribute(
      'href',
      '/develop-train/feature-store/feature-views/rbac/transformed_conv_rate',
    );
    expect(screen.getByRole('cell', { name: 'Entity' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Feature views' })).toBeInTheDocument();
  });

  it('paginates the visits using the table page size', async () => {
    const user = userEvent.setup();
    setupHook();

    renderRecentlyVisited();

    const pageLinkNames = () =>
      screen.getAllByRole('link', { name: /in rbac project$/ }).map((link) => link.textContent);

    // The fixture holds 16 visits and the dashboard table page size is 10.
    const page1Names = pageLinkNames();
    expect(page1Names).toHaveLength(10);

    // Verify page 1 contains the first visit from the fixture.
    expect(page1Names[0]).toBe('__dummy');
    // driver_hourly_stats is viewed more recently than driver and transformed_conv_rate.
    expect(page1Names).toContain('driver_hourly_stats');
    expect(page1Names).not.toContain('driver');
    expect(page1Names).not.toContain('transformed_conv_rate');

    // The table renders one pagination in the top toolbar and one below the table.
    const [nextButton] = screen.getAllByRole('button', { name: /next/i });
    expect(nextButton).toBeEnabled();
    await user.click(nextButton);

    const page2Names = pageLinkNames();
    expect(page2Names).toHaveLength(6);

    // The window moved: visits only reachable on page 2 are now rendered.
    expect(page2Names).toContain('driver');
    expect(page2Names).toContain('transformed_conv_rate');
    expect(page2Names).not.toContain('driver_hourly_stats');
  });

  it('requests the given project and limit from the API hook', () => {
    renderRecentlyVisited({ project: 'credit_scoring_local', limit: 3 });

    expect(mockUseRecentlyVisitedResources).toHaveBeenCalledWith({
      project: 'credit_scoring_local',
      limit: 3,
    });
  });
});
