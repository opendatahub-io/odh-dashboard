import * as React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { mockCuratedBenchmarkSuiteCollections } from '~/app/mockBenchmarkSuiteCollections';
import CuratedBenchmarkSuitesPage from '~/app/pages/CuratedBenchmarkSuitesPage';

const mockUseCollectionsQuery = jest.fn();

const clickFilterOption = (testId: string) => {
  fireEvent.click(within(screen.getByTestId(testId)).getByRole('checkbox'));
};

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

jest.mock('~/app/components/CuratedSuiteRunModal', () => ({
  __esModule: true,
  default: ({ collection, isOpen }: { collection: { name: string }; isOpen: boolean }) =>
    isOpen ? (
      <div data-testid="curated-suite-start-evaluation-run-modal">{collection.name}</div>
    ) : null,
}));

const renderPage = (evaluationTarget = 'agent') =>
  render(
    <MemoryRouter initialEntries={[`/test-project/collections/${evaluationTarget}`]}>
      <Routes>
        <Route
          path="/:namespace/collections/:evaluationTarget"
          element={<CuratedBenchmarkSuitesPage />}
        />
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
    expect(screen.getByTestId('benchmark-suites-category-filter')).toHaveTextContent('Category');
    expect(screen.queryByTestId('benchmark-suites-evaluates-filter')).not.toBeInTheDocument();
    expect(screen.getByTestId('benchmark-suites-pagination-top')).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-suites-pagination-bottom')).not.toBeInTheDocument();
    expect(screen.getByTestId('benchmark-suite-card-clawbench')).toBeInTheDocument();
    expect(screen.getAllByText('Run')).toHaveLength(5);
    expect(screen.queryByText('Customize')).not.toBeInTheDocument();
    expect(mockUseCollectionsQuery).toHaveBeenCalledWith(
      'test-project',
      'system',
      200,
      'curation_order',
      { evaluationTargets: ['agent'] },
      undefined,
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

  it('should link Customize in the action menu to the collection copy route', () => {
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

    fireEvent.click(
      screen.getByTestId('benchmark-suite-card-dropdown-toggle-safety-and-fairness-v1'),
    );

    const customizeAction = screen.getByTestId(
      'benchmark-suite-card-dropdown-action-safety-and-fairness-v1',
    );
    expect(within(customizeAction).getByRole('menuitem')).toHaveAttribute(
      'href',
      '/evaluation/test-project/create/collections/safety-and-fairness-v1/copy',
    );
  });

  it('should open the run modal from a curated suite card', () => {
    renderPage('model');

    fireEvent.click(screen.getByTestId('benchmark-suite-card-primary-action-clawbench'));

    expect(screen.getByTestId('curated-suite-start-evaluation-run-modal')).toHaveTextContent(
      'ClawBench',
    );
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

  it('should only render system collections with a curated index', () => {
    const [curatedCollection] = mockCuratedBenchmarkSuiteCollections('agent');
    const systemOnlyCollection = {
      ...curatedCollection,
      resource: { ...curatedCollection.resource, id: 'system-only-suite' },
      name: 'System-only suite',
      // eslint-disable-next-line camelcase
      curation_order: undefined,
    };
    mockUseCollectionsQuery.mockReturnValue({
      data: {
        items: [systemOnlyCollection, curatedCollection],
        // eslint-disable-next-line camelcase
        total_count: 2,
      },
      isLoading: false,
      error: null,
    });

    renderPage();

    expect(screen.getByTestId('benchmark-suite-card-clawbench')).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-suite-card-system-only-suite')).not.toBeInTheDocument();
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
    clickFilterOption('benchmark-suites-category-filter-option-code');
    fireEvent.click(screen.getByTestId('benchmark-suites-industry-filter'));
    clickFilterOption('benchmark-suites-industry-filter-option-government');

    expect(screen.getByTestId('benchmark-suites-empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-suites-industry-filter')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-suites-category-filter')).toBeInTheDocument();
    expect(mockUseCollectionsQuery).toHaveBeenLastCalledWith(
      'test-project',
      'system',
      200,
      'curation_order',
      { evaluationTargets: ['agent'] },
      undefined,
    );
  });

  it('should reset gallery filters when the evaluation target route changes without remounting', () => {
    mockUseCollectionsQuery.mockImplementation((...args: unknown[]) => {
      const queryFilters = args[4] as { evaluationTargets?: string[] } | undefined;
      const evaluationTarget = queryFilters?.evaluationTargets?.[0] === 'model' ? 'model' : 'agent';
      const items = mockCuratedBenchmarkSuiteCollections(evaluationTarget);

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
            path="/:namespace/collections/:evaluationTarget"
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
    clickFilterOption('benchmark-suites-category-filter-option-code');
    expect(
      screen.getByTestId('benchmark-suite-card-software-engineering-agent-suite'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('switch-to-model'));

    expect(
      screen.getByTestId('benchmark-suite-card-curated-open-llm-leaderboard-v2'),
    ).toBeInTheDocument();
  });
});
