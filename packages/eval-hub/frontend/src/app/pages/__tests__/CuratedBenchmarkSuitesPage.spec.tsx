import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
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

const RouteChangeButton: React.FC = () => {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      data-testid="switch-to-model"
      onClick={() => navigate('/test-project/collections/model')}
    >
      Switch to model suites
    </button>
  );
};

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
    expect(screen.getByTestId('benchmark-suites-category-filter')).toHaveTextContent(
      'All categories',
    );
    expect(screen.queryByTestId('benchmark-suites-evaluates-filter')).not.toBeInTheDocument();
    expect(screen.getByTestId('benchmark-suites-pagination-top')).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-suites-pagination-bottom')).not.toBeInTheDocument();
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

  it('should use curated mock suites when collections fail to load', () => {
    mockUseCollectionsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Curated collections are unavailable'),
    });

    renderPage('model');

    expect(screen.queryByTestId('benchmark-suites-load-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('benchmark-suites-category-filter')).not.toBeDisabled();
    expect(
      screen.getByTestId('benchmark-suite-card-curated-open-llm-leaderboard-v2'),
    ).toBeInTheDocument();
  });

  it('should render an empty state when the API returns no curated suites', () => {
    mockUseCollectionsQuery.mockReturnValue({
      data: {
        items: [],
        // eslint-disable-next-line camelcase
        total_count: 0,
      },
      isLoading: false,
      error: null,
    });

    renderPage('model');

    expect(screen.getByTestId('benchmark-suites-empty-state')).toBeInTheDocument();
    expect(
      screen.queryByTestId('benchmark-suite-card-curated-open-llm-leaderboard-v2'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Customize')).not.toBeInTheDocument();
  });

  it('should hide classification filters while curated suites are loading', () => {
    mockUseCollectionsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      error: null,
    });

    renderPage();

    expect(screen.queryByTestId('benchmark-suites-category-filter')).not.toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-suites-industry-filter')).not.toBeInTheDocument();
  });

  it('should keep filter controls mounted when local filters return no suites', () => {
    renderPage();

    fireEvent.click(screen.getByTestId('benchmark-suites-category-filter'));
    fireEvent.click(screen.getByRole('option', { name: 'Code' }));
    fireEvent.click(screen.getByTestId('benchmark-suites-industry-filter'));
    fireEvent.click(screen.getByRole('option', { name: 'Government' }));

    expect(screen.getByTestId('benchmark-suites-empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-suites-industry-filter')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-suites-category-filter')).toBeInTheDocument();
    expect(mockUseCollectionsQuery).toHaveBeenLastCalledWith(
      'test-project',
      'curated',
      200,
      'curation_order',
      { aiEntities: ['agent'] },
      undefined,
    );
  });

  it('should reset gallery filters when the AI entity route changes without remounting', () => {
    mockUseCollectionsQuery.mockImplementation((...args: unknown[]) => {
      const queryFilters = args[4] as { aiEntities?: string[] } | undefined;
      const aiEntity = queryFilters?.aiEntities?.[0] === 'model' ? 'model' : 'agent';
      const items = mockCuratedBenchmarkSuiteCollections(aiEntity);

      return {
        data: {
          items,
          // eslint-disable-next-line camelcase
          total_count: items.length,
        },
        isLoading: false,
        error: null,
      };
    });

    render(
      <MemoryRouter initialEntries={['/test-project/collections/agent']}>
        <Routes>
          <Route
            path="/:namespace/collections/:aiEntity"
            element={
              <>
                <CuratedBenchmarkSuitesPage />
                <RouteChangeButton />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('benchmark-suites-category-filter'));
    fireEvent.click(screen.getByRole('option', { name: 'Code' }));
    expect(
      screen.getByTestId('benchmark-suite-card-software-engineering-agent-suite'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('switch-to-model'));

    expect(
      screen.getByTestId('benchmark-suite-card-curated-open-llm-leaderboard-v2'),
    ).toBeInTheDocument();
  });
});
