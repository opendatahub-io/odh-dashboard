import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import AutoragExperimentsPage from '~/app/pages/AutoragExperimentsPage';

let mockListStatusReport: { loaded: boolean; hasExperiments: boolean } = {
  loaded: false,
  hasExperiments: false,
};

jest.mock('~/app/components/experiments/AutoragExperiments', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  function MockAutoragExperiments({
    onExperimentsListStatus,
  }: {
    onExperimentsListStatus?: (s: { loaded: boolean; hasExperiments: boolean }) => void;
  }) {
    R.useLayoutEffect(() => {
      onExperimentsListStatus?.(mockListStatusReport);
    });
    return <div data-testid="mock-autorag-experiments" />;
  }
  return { __esModule: true, default: MockAutoragExperiments };
});

jest.mock('~/app/hooks/usePreferredNamespaceRedirect', () => ({
  usePreferredNamespaceRedirect: jest.fn(),
}));

const mockUseNamespaceSelector = jest.fn();
jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  useNamespaceSelector: () => mockUseNamespaceSelector(),
}));

jest.mock('~/app/components/common/ProjectSelectorNavigator', () => ({
  __esModule: true,
  default: () => <div data-testid="project-nav" />,
}));

jest.mock('mod-arch-shared', () => ({
  ApplicationsPage: ({
    children,
    headerContent,
    empty,
    loaded,
    emptyStatePage,
  }: {
    children: React.ReactNode;
    headerContent?: React.ReactNode;
    empty: boolean;
    loaded: boolean;
    emptyStatePage: React.ReactNode;
  }) => (
    <div data-testid="applications-page">
      {loaded && !empty && headerContent ? (
        <div data-testid="page-header">{headerContent}</div>
      ) : null}
      {empty ? emptyStatePage : null}
      {loaded && !empty ? children : null}
    </div>
  ),
  TitleWithIcon: ({ title }: { title: string }) => <span>{title}</span>,
  ProjectObjectType: { pipelineExperiment: 'pipelineExperiment' },
}));

const defaultNamespaceSelector = {
  namespaces: [{ name: 'test-ns' }, { name: 'other-ns' }],
  namespacesLoaded: true,
  namespacesLoadError: undefined,
};

function renderPage(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/experiments/:namespace?" element={<AutoragExperimentsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AutoragExperimentsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListStatusReport = { loaded: false, hasExperiments: false };
    mockUseNamespaceSelector.mockReturnValue(defaultNamespaceSelector);
  });

  it('does not show header create run button while list status is loading', () => {
    mockListStatusReport = { loaded: false, hasExperiments: false };
    renderPage('/experiments/test-ns');
    expect(screen.queryByTestId('autorag-header-create-run-button')).not.toBeInTheDocument();
  });

  it('does not show header create run button when list is loaded but has no experiments', () => {
    mockListStatusReport = { loaded: true, hasExperiments: false };
    renderPage('/experiments/test-ns');
    expect(screen.queryByTestId('autorag-header-create-run-button')).not.toBeInTheDocument();
  });

  it('shows header create run button when list is loaded and has experiments', () => {
    mockListStatusReport = { loaded: true, hasExperiments: true };
    renderPage('/experiments/test-ns');
    expect(screen.getByTestId('autorag-header-create-run-button')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create RAG optimization run' })).toBeInTheDocument();
  });

  it('does not show header create run button when namespace is invalid (empty application state)', () => {
    mockListStatusReport = { loaded: true, hasExperiments: true };
    renderPage('/experiments/unknown-ns');
    expect(screen.queryByTestId('autorag-header-create-run-button')).not.toBeInTheDocument();
  });

  it('does not show header create run button when there are no projects', () => {
    mockListStatusReport = { loaded: true, hasExperiments: true };
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [],
      namespacesLoaded: true,
      namespacesLoadError: undefined,
    });
    renderPage('/experiments/test-ns');
    expect(screen.queryByTestId('autorag-header-create-run-button')).not.toBeInTheDocument();
  });
});
