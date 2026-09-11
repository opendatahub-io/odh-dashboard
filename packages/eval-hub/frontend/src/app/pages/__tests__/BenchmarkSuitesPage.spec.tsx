import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { mockBenchmarkSuiteCollections } from '~/app/mockBenchmarkSuiteCollections';
import BenchmarkSuitesPage from '~/app/pages/BenchmarkSuitesPage';

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

jest.mock('~/app/hooks/useProviders', () => ({
  useProviders: () => ({ providers: [], loaded: true, loadError: undefined }),
}));

jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core'),
  ...require('~/__tests__/unit/testUtils/mocks').mockApplicationsPageModule(),
}));

jest.mock('~/app/components/StartEvaluationRunModal', () => ({
  __esModule: true,
  default: ({ collection, isOpen }: { collection?: { name: string }; isOpen: boolean }) =>
    isOpen ? (
      <div data-testid="benchmark-suites-page-start-evaluation-run-modal">{collection?.name}</div>
    ) : null,
}));

const LocationDisplay = () => {
  const { pathname } = useLocation();
  return <div data-testid="location-pathname">{pathname}</div>;
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/test-project/collections']}>
      <LocationDisplay />
      <Routes>
        <Route path="/:namespace/collections" element={<BenchmarkSuitesPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('BenchmarkSuitesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCollectionsQuery.mockReturnValue({
      data: {
        items: mockBenchmarkSuiteCollections(),
        // Match the BFF response field name used by CollectionsListResponse.
        // eslint-disable-next-line camelcase
        total_count: 8,
      },
      isLoading: false,
      error: null,
    });
  });

  it('should render all tenant benchmark suites', () => {
    renderPage();

    expect(screen.getByText('My benchmark suites')).toBeInTheDocument();
    expect(
      screen.getByText('View, run, and manage all benchmark suites you have created or saved.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('create-benchmark-suite-button')).toBeInTheDocument();
    expect(screen.queryByTestId('create-suite-card')).not.toBeInTheDocument();
    expect(screen.getByTestId('benchmark-suites-filter-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-suites-pagination-top')).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-suites-pagination-bottom')).not.toBeInTheDocument();
    expect(screen.getByTestId('benchmark-suite-card-model-suite-2')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-suite-card-trace-evaluation-suite')).toBeInTheDocument();
    expect(
      screen.getByTestId('benchmark-suite-card-guardrails-compliance-suite'),
    ).toBeInTheDocument();
    expect(mockUseCollectionsQuery).toHaveBeenCalledWith(
      'test-project',
      'tenant',
      6,
      undefined,
      undefined,
      0,
    );
  });

  it('should navigate to the create suite page', async () => {
    renderPage();

    await userEvent.click(screen.getByTestId('create-benchmark-suite-button'));

    expect(screen.getByTestId('location-pathname')).toHaveTextContent(
      '/evaluation/test-project/create/collections/new',
    );
  });

  it('should open the start evaluation run modal for a suite', async () => {
    renderPage();

    await userEvent.click(screen.getAllByRole('button', { name: 'Run benchmark suite' })[0]);

    expect(
      screen.getByTestId('benchmark-suites-page-start-evaluation-run-modal'),
    ).toHaveTextContent('Model suite 2');
  });

  it('should navigate to the copy suite page from Duplicate', async () => {
    renderPage();

    await userEvent.click(screen.getByTestId('benchmark-suite-card-menu-model-suite-2'));
    expect(screen.queryByRole('menuitem', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Duplicate' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }));

    expect(screen.getByTestId('location-pathname')).toHaveTextContent(
      '/evaluation/test-project/create/collections/model-suite-2/copy',
    );
  });

  it('should show a refresh spinner without hiding existing suites while fetching', () => {
    mockUseCollectionsQuery.mockReturnValue({
      data: {
        items: mockBenchmarkSuiteCollections(),
        // eslint-disable-next-line camelcase
        total_count: 8,
      },
      isLoading: false,
      isFetching: true,
      error: null,
    });

    renderPage();

    expect(screen.getByTestId('benchmark-suite-card-model-suite-2')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-suites-refresh-loading')).toBeInTheDocument();
  });

  it('should filter tenant benchmark suites by name', () => {
    renderPage();

    fireEvent.change(screen.getByTestId('benchmark-suites-name-filter').querySelector('input')!, {
      target: { value: 'code' },
    });

    expect(screen.getByTestId('benchmark-suite-card-code-quality-suite')).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-suite-card-model-suite-2')).not.toBeInTheDocument();
  });

  it('should search all collections client-side when the name filter is used', () => {
    const collections = mockBenchmarkSuiteCollections();
    const firstPageCollections = collections.slice(0, 6);

    mockUseCollectionsQuery.mockImplementation((...args: unknown[]) => {
      const limit = args[2];
      const items = limit === 200 ? collections : firstPageCollections;

      return {
        // eslint-disable-next-line camelcase
        data: { items, total_count: collections.length },
        isLoading: false,
        error: null,
      };
    });

    renderPage();

    fireEvent.change(screen.getByTestId('benchmark-suites-name-filter').querySelector('input')!, {
      target: { value: 'finance' },
    });

    expect(screen.getByTestId('benchmark-suite-card-finance-evaluation-suite')).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-suite-card-model-suite-2')).not.toBeInTheDocument();
    expect(mockUseCollectionsQuery).toHaveBeenLastCalledWith(
      'test-project',
      'tenant',
      200,
      undefined,
      undefined,
      undefined,
    );
  });

  it('should show a search icon when no suites match the filters', () => {
    renderPage();

    fireEvent.change(screen.getByTestId('benchmark-suites-name-filter').querySelector('input')!, {
      target: { value: 'not-found' },
    });

    const emptyState = screen.getByTestId('benchmark-suites-empty-state');
    expect(emptyState).toBeInTheDocument();
    expect(emptyState.querySelector('svg')).toBeInTheDocument();
  });

  it('should hide filters when collections do not provide filter fields', () => {
    const collections = mockBenchmarkSuiteCollections().map((collection) => ({
      ...collection,
      category: undefined,
      domains: [],
      // eslint-disable-next-line camelcase
      ai_entities: [],
      industries: [],
    }));

    mockUseCollectionsQuery.mockReturnValue({
      data: {
        items: collections,
        // eslint-disable-next-line camelcase
        total_count: collections.length,
      },
      isLoading: false,
      error: null,
    });

    renderPage();

    expect(screen.queryByTestId('benchmark-suites-category-filter')).not.toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-suites-evaluates-filter')).not.toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-suites-industry-filter')).not.toBeInTheDocument();
  });

  it('should keep filters enabled when an active filter returns no suites', () => {
    renderPage();

    fireEvent.click(screen.getByTestId('benchmark-suites-category-filter'));
    fireEvent.click(screen.getByRole('option', { name: 'Code' }));
    fireEvent.click(screen.getByTestId('benchmark-suites-industry-filter'));
    fireEvent.click(screen.getByRole('option', { name: 'Health' }));

    expect(screen.getByTestId('benchmark-suites-empty-state')).toHaveTextContent(
      'No benchmark suites match the current filters.',
    );
    expect(
      screen.getByTestId('benchmark-suites-name-filter').querySelector('input'),
    ).not.toBeDisabled();
    expect(screen.getByTestId('benchmark-suites-category-filter')).not.toBeDisabled();
    expect(screen.getByTestId('benchmark-suites-industry-filter')).not.toBeDisabled();
  });

  it('should derive filter options from collection fields', async () => {
    const collections = mockBenchmarkSuiteCollections().map((collection, index) => ({
      ...collection,
      category: index % 2 === 0 ? 'z-category' : 'a-category',
      domains: ['domain-only'],
      // eslint-disable-next-line camelcase
      ai_entities: [index % 2 === 0 ? 'z-entity' : 'a-entity'],
      industries: [index % 2 === 0 ? 'z-industry' : 'a-industry'],
    }));
    mockUseCollectionsQuery.mockReturnValue({
      data: {
        items: collections,
        // eslint-disable-next-line camelcase
        total_count: collections.length,
      },
      isLoading: false,
      error: null,
    });

    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByTestId('benchmark-suites-category-filter'));

    expect(
      screen.getByTestId('benchmark-suites-category-filter-option-a-category'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('benchmark-suites-category-filter-option-z-category'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('benchmark-suites-category-filter-option-domain-only'),
    ).not.toBeInTheDocument();

    await user.click(screen.getByTestId('benchmark-suites-category-filter-option-all'));
    await user.click(screen.getByTestId('benchmark-suites-evaluates-filter'));

    expect(
      screen.getByTestId('benchmark-suites-evaluates-filter-option-a-entity'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('benchmark-suites-evaluates-filter-option-z-entity'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('benchmark-suites-evaluates-filter-option-model'),
    ).not.toBeInTheDocument();

    await user.click(screen.getByTestId('benchmark-suites-evaluates-filter-option-all'));
    await user.click(screen.getByTestId('benchmark-suites-industry-filter'));

    expect(
      screen.getByTestId('benchmark-suites-industry-filter-option-a-industry'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('benchmark-suites-industry-filter-option-z-industry'),
    ).toBeInTheDocument();
  });

  it('should filter tenant benchmark suites by category and evaluates type', () => {
    renderPage();

    fireEvent.click(screen.getByTestId('benchmark-suites-category-filter'));
    fireEvent.click(screen.getByRole('option', { name: 'Code' }));

    expect(screen.getByTestId('benchmark-suite-card-code-quality-suite')).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-suite-card-model-suite-2')).not.toBeInTheDocument();
    expect(mockUseCollectionsQuery).toHaveBeenLastCalledWith(
      'test-project',
      'tenant',
      200,
      undefined,
      undefined,
      undefined,
    );

    fireEvent.click(screen.getByTestId('benchmark-suites-category-filter'));
    fireEvent.click(screen.getByRole('option', { name: 'All categories' }));
    fireEvent.click(screen.getByTestId('benchmark-suites-evaluates-filter'));
    fireEvent.click(screen.getByRole('option', { name: 'Agent' }));

    expect(screen.getByTestId('benchmark-suite-card-agent-safety-suite')).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-suite-card-code-quality-suite')).not.toBeInTheDocument();
    expect(mockUseCollectionsQuery).toHaveBeenLastCalledWith(
      'test-project',
      'tenant',
      200,
      undefined,
      undefined,
      undefined,
    );
  });
});
