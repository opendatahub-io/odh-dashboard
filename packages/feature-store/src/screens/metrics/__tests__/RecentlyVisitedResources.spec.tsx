/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
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
    setupHook({ error: new Error('forbidden'), data: mockRecentlyVisited({ visits: [] }) });

    renderRecentlyVisited();

    expect(screen.getByTestId('recently-visited-resources-error-state')).toBeInTheDocument();
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

  it('paginates the visits using the table page size', () => {
    setupHook();

    renderRecentlyVisited();

    // The fixture holds 16 visits and the dashboard table page size is 10.
    expect(screen.getAllByRole('link', { name: /in rbac project$/ })).toHaveLength(10);
  });

  it('requests the given project and limit from the API hook', () => {
    renderRecentlyVisited({ project: 'credit_scoring_local', limit: 3 });

    expect(mockUseRecentlyVisitedResources).toHaveBeenCalledWith({
      project: 'credit_scoring_local',
      limit: 3,
    });
  });
});
