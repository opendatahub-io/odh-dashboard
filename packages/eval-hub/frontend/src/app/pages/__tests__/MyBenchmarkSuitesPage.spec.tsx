import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { mockBenchmarkSuiteCollections } from '~/app/mockBenchmarkSuiteCollections';
import MyBenchmarkSuitesPage from '~/app/pages/MyBenchmarkSuitesPage';

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

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/test-project/collections']}>
      <Routes>
        <Route path="/:namespace/collections" element={<MyBenchmarkSuitesPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('MyBenchmarkSuitesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCollectionsQuery.mockReturnValue({
      data: {
        items: mockBenchmarkSuiteCollections(),
        // Match the BFF response field name used by CollectionsListResponse.
        // eslint-disable-next-line camelcase
        total_count: 6,
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
    expect(screen.getByTestId('create-suite-card')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-suite-card-model-suite-2')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-suite-card-trace-evaluation-suite')).toBeInTheDocument();
    expect(
      screen.getByTestId('benchmark-suite-card-guardrails-compliance-suite'),
    ).toBeInTheDocument();
    expect(mockUseCollectionsQuery).toHaveBeenCalledWith('test-project', 'tenant', undefined);
  });
});
