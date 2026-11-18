import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { TrackingProvider } from '../../../__tests__/unit/testUtils/TrackingProvider';
import { mockResourceCounts } from '../../../__mocks__/mockMetrics';
import { MetricsCountResponse } from '../../../types/metrics';
import MetricCards from '../MetricCards';

const renderMetricCards = (metricsData?: MetricsCountResponse, loaded = true) =>
  render(
    <TrackingProvider>
      <MemoryRouter>
        <MetricCards metricsData={metricsData} loaded={loaded} />
      </MemoryRouter>
    </TrackingProvider>,
  );

describe('MetricCards', () => {
  it('renders one card per resource type', () => {
    renderMetricCards(mockResourceCounts());

    expect(screen.getByTestId('feature-store-metrics-card-entities')).toBeInTheDocument();
    expect(screen.getByTestId('feature-store-metrics-card-data sources')).toBeInTheDocument();
    expect(screen.getByTestId('feature-store-metrics-card-datasets')).toBeInTheDocument();
    expect(screen.getByTestId('feature-store-metrics-card-features')).toBeInTheDocument();
    expect(screen.getByTestId('feature-store-metrics-card-feature views')).toBeInTheDocument();
    expect(screen.getByTestId('feature-store-metrics-card-feature services')).toBeInTheDocument();
  });

  it('shows the resource counts returned by the API', () => {
    renderMetricCards(mockResourceCounts());

    expect(
      within(screen.getByTestId('feature-store-metrics-card-entities')).getByText('2'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('feature-store-metrics-card-data sources')).getByText('3'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('feature-store-metrics-card-features')).getByText('10'),
    ).toBeInTheDocument();
  });

  it('links each non-empty card to its resource page', () => {
    renderMetricCards(mockResourceCounts());

    const link = within(screen.getByTestId('feature-store-metrics-card-features')).getByRole(
      'link',
      {
        name: 'Go to Features page',
      },
    );
    expect(link).toHaveAttribute('href', '/develop-train/feature-store/features');
  });

  it('shows an empty message instead of a link when a resource count is zero', () => {
    renderMetricCards(mockResourceCounts());

    const datasetsCard = screen.getByTestId('feature-store-metrics-card-datasets');
    expect(within(datasetsCard).getByText('No available datasets')).toBeInTheDocument();
    expect(within(datasetsCard).queryByRole('link')).not.toBeInTheDocument();
  });

  it('falls back to the aggregate total counts when no project breakdown is present', () => {
    renderMetricCards(
      mockResourceCounts({
        project: undefined,
        counts: undefined,
        total: {
          entities: 7,
          dataSources: 1,
          savedDatasets: 5,
          features: 42,
          featureViews: 9,
          featureServices: 4,
        },
      }),
    );

    expect(
      within(screen.getByTestId('feature-store-metrics-card-entities')).getByText('7'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('feature-store-metrics-card-features')).getByText('42'),
    ).toBeInTheDocument();
  });

  it('renders loading placeholders instead of counts while not loaded', () => {
    renderMetricCards(mockResourceCounts(), false);

    const entitiesCard = screen.getByTestId('feature-store-metrics-card-entities');
    expect(entitiesCard).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText('No available datasets')).not.toBeInTheDocument();
    expect(within(entitiesCard).queryByText('2')).not.toBeInTheDocument();
    // PF Skeleton renders a bare div with the pf-v6-c-skeleton class and no role, so a class
    // query is the only way to assert the placeholder is actually there. The card renders one
    // skeleton for the count (body) and one for the link (footer).
    expect(entitiesCard.querySelectorAll('.pf-v6-c-skeleton')).toHaveLength(2);
  });

  it('renders no cards when there is no metrics data', () => {
    renderMetricCards(undefined);

    expect(screen.queryByTestId('feature-store-metrics-card-entities')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
