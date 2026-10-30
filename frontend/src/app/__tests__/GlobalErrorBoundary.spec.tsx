import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Page } from '@patternfly/react-core';
import { resolveWorkingProject } from '@odh-dashboard/foundation';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { useProjects } from '#~/api';
import { useDashboardNamespace } from '#~/redux/selectors';
import ProjectsContextProvider from '#~/concepts/projects/ProjectsContext';
import ErrorBoundary from '#~/components/error/ErrorBoundary';
import GlobalErrorBoundary from '#~/app/GlobalErrorBoundary';

jest.mock('#~/api', () => ({ useProjects: jest.fn() }));
jest.mock('#~/redux/selectors', () => ({ useDashboardNamespace: jest.fn() }));
jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));
jest.mock('@odh-dashboard/foundation', () => ({
  ...jest.requireActual('@odh-dashboard/foundation'),
  resolveWorkingProject: jest.fn(),
}));

const ThrowingContent: React.FC<{ error: Error }> = ({ error }) => {
  throw error;
};

const Application: React.FC<{ error?: Error }> = ({ error }) => (
  <GlobalErrorBoundary>
    <ProjectsContextProvider>
      <Page
        data-testid="normal-page"
        masthead={<header data-testid="normal-masthead">Masthead</header>}
        sidebar={<nav data-testid="normal-sidebar">Navigation</nav>}
      >
        <ErrorBoundary>
          {error ? (
            <ThrowingContent error={error} />
          ) : (
            <div data-testid="healthy-content">Content</div>
          )}
        </ErrorBoundary>
      </Page>
    </ProjectsContextProvider>
  </GlobalErrorBoundary>
);

describe('GlobalErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(useProjects).mockReturnValue([[], true, undefined]);
    jest.mocked(useDashboardNamespace).mockReturnValue({ dashboardNamespace: 'dashboard' });
    jest.mocked(useIsAreaAvailable).mockReturnValue({
      status: true,
    } as ReturnType<typeof useIsAreaAvailable>);
    jest
      .mocked(resolveWorkingProject)
      .mockImplementation(
        jest.requireActual<typeof import('@odh-dashboard/foundation')>('@odh-dashboard/foundation')
          .resolveWorkingProject,
      );
  });

  afterEach(() => jest.restoreAllMocks());

  it('should not wrap healthy content in a recovery Page', () => {
    render(<Application />);

    expect(screen.getByTestId('healthy-content')).toBeInTheDocument();
    expect(screen.getByTestId('normal-masthead')).toBeInTheDocument();
    expect(screen.queryByTestId('app-error-fallback')).not.toBeInTheDocument();
  });

  it('should render recovery navigation when the project provider throws', () => {
    jest.mocked(useProjects).mockImplementation(() => {
      throw new Error('Project provider failed');
    });

    render(<Application />);

    expect(screen.getByTestId('app-error-fallback')).toBeInTheDocument();
    expect(screen.getByRole('banner', { name: 'page masthead' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return to dashboard' })).toHaveAttribute('href', '/');
    expect(screen.getByTestId('reload-link')).toBeInTheDocument();
    expect(screen.getByText('Project provider failed')).toBeInTheDocument();
    expect(screen.queryByTestId('normal-page')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'dashboard-page-main');
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('should render a recovery shell when the working-project adapter throws', () => {
    jest.mocked(resolveWorkingProject).mockImplementation(() => {
      throw new Error('Working-project adapter failed');
    });

    render(<Application />);

    expect(screen.getByTestId('app-error-fallback')).toBeInTheDocument();
    expect(screen.getByText('Working-project adapter failed')).toBeInTheDocument();
  });

  it('should preserve the normal shell when inner content throws', () => {
    render(<Application error={new Error('Content failed')} />);

    expect(screen.getByTestId('normal-masthead')).toBeInTheDocument();
    expect(screen.getByTestId('normal-sidebar')).toBeInTheDocument();
    expect(screen.getByText('Content failed')).toBeInTheDocument();
    expect(screen.queryByTestId('app-error-fallback')).not.toBeInTheDocument();
  });

  it('should not activate the recovery shell for an ordinary project API error', () => {
    jest.mocked(useProjects).mockReturnValue([[], true, new Error('API unavailable')]);

    render(<Application />);

    expect(screen.getByTestId('healthy-content')).toBeInTheDocument();
    expect(screen.queryByTestId('app-error-fallback')).not.toBeInTheDocument();
  });

  it('should remount the normal application after resetting a recovered provider', () => {
    jest.mocked(useProjects).mockImplementation(() => {
      throw new Error('Temporary provider failure');
    });
    render(<Application />);

    jest.mocked(useProjects).mockReturnValue([[], true, undefined]);
    fireEvent.click(screen.getByTestId('close-error-button'));

    expect(screen.getByTestId('healthy-content')).toBeInTheDocument();
    expect(screen.queryByTestId('app-error-fallback')).not.toBeInTheDocument();
  });

  it('should keep the recovery shell while showing chunk-load error details', () => {
    const error = new Error('A chunk failed to load');
    error.name = 'ChunkLoadError';
    jest.mocked(useProjects).mockImplementation(() => {
      throw error;
    });
    render(<Application />);

    expect(screen.getByTestId('app-error-fallback')).toBeInTheDocument();
    expect(screen.getByTestId('reload-button')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('show-error-button'));

    expect(screen.getByTestId('app-error-fallback')).toBeInTheDocument();
    expect(screen.getByText('A chunk failed to load')).toBeInTheDocument();
    expect(screen.getByTestId('error-dashboard-link')).toHaveAttribute('href', '/');
  });
});
