import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/test-project/collections']}>
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
    expect(screen.getByTestId('benchmark-suites-pagination-bottom')).toBeInTheDocument();
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

  it('should filter tenant benchmark suites by name', () => {
    renderPage();

    fireEvent.change(screen.getByTestId('benchmark-suites-name-filter').querySelector('input')!, {
      target: { value: 'code' },
    });

    expect(screen.getByTestId('benchmark-suite-card-code-quality-suite')).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-suite-card-model-suite-2')).not.toBeInTheDocument();
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

  it('should filter tenant benchmark suites by category and evaluates type', () => {
    renderPage();

    fireEvent.click(screen.getByTestId('benchmark-suites-category-filter'));
    fireEvent.click(screen.getByRole('option', { name: 'Code' }));

    expect(screen.getByTestId('benchmark-suite-card-code-quality-suite')).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-suite-card-model-suite-2')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('benchmark-suites-category-filter'));
    fireEvent.click(screen.getByRole('option', { name: 'All categories' }));
    fireEvent.click(screen.getByTestId('benchmark-suites-evaluates-filter'));
    fireEvent.click(screen.getByRole('option', { name: 'Agent' }));

    expect(screen.getByTestId('benchmark-suite-card-agent-safety-suite')).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-suite-card-code-quality-suite')).not.toBeInTheDocument();
  });
});
