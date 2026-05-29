import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import AutoragExperimentsPage from '~/app/pages/AutoragExperimentsPage';

let mockListStatusReport: { loaded: boolean; hasExperiments: boolean } = {
  loaded: false,
  hasExperiments: false,
};

/** Captures payloads passed to onExperimentsListStatus from the mock child (passive useEffect; matches prod). */
const autoragMockChildNotifyLog: { loaded: boolean; hasExperiments: boolean }[] = [];

jest.mock('~/app/components/experiments/AutoragExperiments', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const router = jest.requireActual<typeof import('react-router')>('react-router');
  function MockAutoragExperiments({
    onExperimentsListStatus,
  }: {
    onExperimentsListStatus?: (s: { loaded: boolean; hasExperiments: boolean }) => void;
  }) {
    const { namespace } = router.useParams();
    R.useEffect(() => {
      const snapshot = { ...mockListStatusReport };
      autoragMockChildNotifyLog.push(snapshot);
      onExperimentsListStatus?.(snapshot);
    }, [namespace, mockListStatusReport.loaded, mockListStatusReport.hasExperiments]);
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

function uiAtPath(initialPath: string) {
  return (
    <MemoryRouter key={initialPath} initialEntries={[initialPath]}>
      <Routes>
        <Route path="/experiments/:namespace?" element={<AutoragExperimentsPage />} />
      </Routes>
    </MemoryRouter>
  );
}

function renderPage(initialPath: string) {
  return render(uiAtPath(initialPath));
}

describe('AutoragExperimentsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListStatusReport = { loaded: false, hasExperiments: false };
    autoragMockChildNotifyLog.length = 0;
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
    expect(
      screen.getByRole('button', { name: 'Create AutoRAG optimization run' }),
    ).toBeInTheDocument();
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

  it('hides header CTA during namespace switch until new list status loads', () => {
    mockUseNamespaceSelector.mockReturnValue(defaultNamespaceSelector);

    mockListStatusReport = { loaded: true, hasExperiments: true };
    const { rerender } = renderPage('/experiments/test-ns');
    expect(screen.getByTestId('autorag-header-create-run-button')).toBeInTheDocument();

    mockListStatusReport = { loaded: false, hasExperiments: false };
    rerender(uiAtPath('/experiments/other-ns'));
    expect(screen.queryByTestId('autorag-header-create-run-button')).not.toBeInTheDocument();

    mockListStatusReport = { loaded: true, hasExperiments: false };
    rerender(uiAtPath('/experiments/other-ns'));
    expect(screen.queryByTestId('autorag-header-create-run-button')).not.toBeInTheDocument();

    mockListStatusReport = { loaded: true, hasExperiments: true };
    rerender(uiAtPath('/experiments/other-ns'));
    expect(screen.getByTestId('autorag-header-create-run-button')).toBeInTheDocument();
  });

  it('after namespace change, header stays off until child reports new status (layout reset before passive notify)', () => {
    mockUseNamespaceSelector.mockReturnValue(defaultNamespaceSelector);

    mockListStatusReport = { loaded: true, hasExperiments: true };
    const { rerender } = renderPage('/experiments/test-ns');
    expect(screen.getByTestId('autorag-header-create-run-button')).toBeInTheDocument();

    const notifyCountBeforeSwitch = autoragMockChildNotifyLog.length;

    mockListStatusReport = { loaded: false, hasExperiments: false };
    rerender(uiAtPath('/experiments/other-ns'));

    expect(screen.queryByTestId('autorag-header-create-run-button')).not.toBeInTheDocument();

    const notifiesFromNewMount = autoragMockChildNotifyLog.slice(notifyCountBeforeSwitch);
    expect(notifiesFromNewMount[0]).toEqual({ loaded: false, hasExperiments: false });

    mockListStatusReport = { loaded: true, hasExperiments: true };
    rerender(uiAtPath('/experiments/other-ns'));
    expect(screen.getByTestId('autorag-header-create-run-button')).toBeInTheDocument();
  });
});
