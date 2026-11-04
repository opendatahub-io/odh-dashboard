import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import useIsMlflowCRAvailable from '@odh-dashboard/internal/concepts/mlflow/hooks/useIsMlflowCRAvailable';
import WorkspaceRouteLoader from '../WorkspaceRouteLoader';

type CapturedNoProjectsProps = { getRedirectPath: (namespace: string) => string };
let capturedNoProjectsProps: CapturedNoProjectsProps | undefined;
jest.mock('../NoProjectsEmptyState', () => ({
  __esModule: true,
  default: (props: CapturedNoProjectsProps) => {
    capturedNoProjectsProps = props;
    return null;
  },
}));

jest.mock('@odh-dashboard/internal/concepts/mlflow/hooks/useIsMlflowCRAvailable', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@odh-dashboard/ui-core', () => ({
  ApplicationsPage: ({
    emptyStatePage,
    loaded,
  }: {
    emptyStatePage?: React.ReactNode;
    loaded: boolean;
  }) => <>{loaded ? emptyStatePage : <div data-testid="workspace-loading" />}</>,
}));

jest.mock('@odh-dashboard/internal/pages/pipelines/global/PipelineCoreProjectSelector', () => ({
  __esModule: true,
  default: () => null,
}));

const mockUseIsMlflowCRAvailable = jest.mocked(useIsMlflowCRAvailable);

const renderWithoutProjects = (
  props: Pick<
    React.ComponentProps<typeof WorkspaceRouteLoader>,
    'getRedirectPath' | 'getNoProjectsRedirectPath'
  >,
  PageComponent: React.ComponentType = () => null,
) =>
  render(
    <MemoryRouter initialEntries={['/ai-hub/skills/@acme/code-review?version=2']}>
      <ProjectsContext.Provider
        value={{
          projects: [],
          modelServingProjects: [],
          nonActiveProjects: [],
          preferredProject: null,
          updatePreferredProject: () => undefined,
          waitForProject: () => Promise.resolve(),
          loaded: true,
          loadError: undefined,
        }}
      >
        <WorkspaceRouteLoader
          title="Skills"
          noProjectsMessage="To use skills, first create a project."
          noProjectsTestId="no-projects"
          PageComponent={PageComponent}
          {...props}
        />
      </ProjectsContext.Provider>
    </MemoryRouter>,
  );

describe('WorkspaceRouteLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedNoProjectsProps = undefined;
    mockUseIsMlflowCRAvailable.mockReturnValue({ available: true, loaded: true, error: false });
  });

  it('should render MLflow setup before project creation when MLflow is unavailable', () => {
    mockUseIsMlflowCRAvailable.mockReturnValue({ available: false, loaded: true, error: false });

    renderWithoutProjects(
      { getRedirectPath: (namespace) => `/page?workspace=${namespace}` },
      () => <div data-testid="mlflow-page" />,
    );

    expect(screen.getByTestId('mlflow-page')).toBeInTheDocument();
    expect(capturedNoProjectsProps).toBeUndefined();
  });

  it('should wait for MLflow availability before showing the no-projects state', () => {
    mockUseIsMlflowCRAvailable.mockReturnValue({ available: false, loaded: false, error: false });

    renderWithoutProjects({ getRedirectPath: (namespace) => `/page?workspace=${namespace}` });

    expect(screen.getByTestId('workspace-loading')).toBeInTheDocument();
    expect(capturedNoProjectsProps).toBeUndefined();
  });

  it('should send a project created from the no-projects state to getNoProjectsRedirectPath', () => {
    const getRedirectPath = jest.fn((namespace: string) => `/skill?workspace=${namespace}`);
    const getNoProjectsRedirectPath = (namespace: string) => `/catalog?workspace=${namespace}`;
    renderWithoutProjects({ getRedirectPath, getNoProjectsRedirectPath });

    expect(capturedNoProjectsProps?.getRedirectPath('new-project')).toBe(
      '/catalog?workspace=new-project',
    );
    expect(getRedirectPath).not.toHaveBeenCalled();
  });

  it('should fall back to getRedirectPath for the no-projects state', () => {
    const getRedirectPath = (namespace: string) => `/page?workspace=${namespace}`;
    renderWithoutProjects({ getRedirectPath });

    expect(capturedNoProjectsProps?.getRedirectPath).toBe(getRedirectPath);
  });
});
