import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { mockCuratedBenchmarkSuiteCollections } from '~/app/mockBenchmarkSuiteCollections';
import CuratedBenchmarkSuitesPage from '~/app/pages/CuratedBenchmarkSuitesPage';

const mockUseCollectionsQuery = jest.fn();

jest.mock('~/app/hooks/collections', () => ({
  useCollectionsQuery: (...args: unknown[]) => mockUseCollectionsQuery(...args),
  useDeleteCollectionMutation: () => ({
    error: null,
    isPending: false,
    mutateAsync: jest.fn(),
    reset: jest.fn(),
  }),
}));

jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core'),
  ...require('~/__tests__/unit/testUtils/mocks').mockApplicationsPageModule(),
}));

const renderPage = (aiEntity = 'agent') =>
  render(
    <MemoryRouter initialEntries={[`/test-project/collections/${aiEntity}`]}>
      <Routes>
        <Route path="/:namespace/collections/:aiEntity" element={<CuratedBenchmarkSuitesPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('CuratedBenchmarkSuitesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCollectionsQuery.mockReturnValue({
      data: {
        items: mockCuratedBenchmarkSuiteCollections('agent'),
        // Match the BFF response field name used by CollectionsListResponse.
        // eslint-disable-next-line camelcase
        total_count: 5,
      },
      isLoading: false,
      error: null,
    });
  });

  it('should render agent curated benchmark suites', () => {
    renderPage();

    expect(screen.getByText('Agent benchmark suites')).toBeInTheDocument();
    expect(
      screen.getByText('Select a benchmark suite to evaluate your agent.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('create-benchmark-suite-button')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-suites-category-filter')).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-suites-evaluates-filter')).not.toBeInTheDocument();
    expect(screen.getByTestId('benchmark-suites-pagination-top')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-suites-pagination-bottom')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-suite-card-clawbench')).toBeInTheDocument();
    expect(screen.getAllByText('Customize')).toHaveLength(5);
    expect(mockUseCollectionsQuery).toHaveBeenCalledWith(
      'test-project',
      'curated',
      6,
      'curation_order',
      { aiEntities: ['agent'] },
      0,
    );
  });

  it('should render model page copy for the model route', () => {
    mockUseCollectionsQuery.mockReturnValue({
      data: {
        items: mockCuratedBenchmarkSuiteCollections('model'),
        // eslint-disable-next-line camelcase
        total_count: 8,
      },
      isLoading: false,
      error: null,
    });

    renderPage('model');

    expect(screen.getByText('Model benchmark suites')).toBeInTheDocument();
    expect(
      screen.getByText('Select a benchmark suite to evaluate your model.'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('benchmark-suite-card-curated-open-llm-leaderboard-v2'),
    ).toBeInTheDocument();
  });

  it('should show a PatternFly error state when curated collections fail to load', () => {
    mockUseCollectionsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Curated collections are unavailable'),
    });

    renderPage('model');

    expect(screen.getByTestId('benchmark-suites-load-error')).toBeInTheDocument();
    expect(screen.getByText('Unable to load benchmark suites')).toBeInTheDocument();
    expect(
      screen.queryByTestId('benchmark-suite-card-curated-open-llm-leaderboard-v2'),
    ).not.toBeInTheDocument();
  });
});
