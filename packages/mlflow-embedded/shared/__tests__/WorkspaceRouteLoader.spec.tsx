import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
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

jest.mock('@odh-dashboard/ui-core', () => ({
  ApplicationsPage: ({ emptyStatePage }: { emptyStatePage?: React.ReactNode }) => (
    <>{emptyStatePage}</>
  ),
}));

jest.mock('@odh-dashboard/internal/pages/pipelines/global/PipelineCoreProjectSelector', () => ({
  __esModule: true,
  default: () => null,
}));

const renderWithoutProjects = (
  props: Pick<
    React.ComponentProps<typeof WorkspaceRouteLoader>,
    'getRedirectPath' | 'getNoProjectsRedirectPath'
  >,
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
          PageComponent={() => null}
          {...props}
        />
      </ProjectsContext.Provider>
    </MemoryRouter>,
  );

describe('WorkspaceRouteLoader', () => {
  beforeEach(() => {
    capturedNoProjectsProps = undefined;
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
