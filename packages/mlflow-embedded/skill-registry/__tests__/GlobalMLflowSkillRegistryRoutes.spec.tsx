import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { loadRemote } from '@module-federation/runtime';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import GlobalMLflowSkillRegistryRoutes from '../GlobalMLflowSkillRegistryRoutes';
import { MlflowSkillRegistryWrapperProps } from '../MlflowSkillRegistryPage';

jest.mock('@module-federation/runtime', () => ({ loadRemote: jest.fn() }));

jest.mock('@odh-dashboard/internal/concepts/mlflow/hooks/useIsMlflowCRAvailable', () => ({
  __esModule: true,
  default: () => ({ available: true, loaded: true, error: false }),
}));

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireLinkTrackingEvent: jest.fn(),
}));

jest.mock('@odh-dashboard/ui-core/components/projectSelector/ProjectSelectorNavigator', () => ({
  __esModule: true,
  default: () => <div data-testid="project-selector" />,
}));

jest.mock('@odh-dashboard/internal/pages/pipelines/global/PipelineCoreProjectSelector', () => ({
  __esModule: true,
  default: () => null,
}));

const FakeSkillRegistry: React.FC<MlflowSkillRegistryWrapperProps> = ({
  basename,
  onBreadcrumbChange,
}) => {
  const { pathname, search } = useLocation();
  return (
    <div data-testid="fake-skill-registry" data-basename={basename}>
      <span data-testid="fake-skill-registry-location">{`${pathname}${search}`}</span>
      <button
        onClick={() =>
          onBreadcrumbChange([
            { label: 'Skills', path: '/' },
            { label: '@acme/code-review', path: '/@acme/code-review' },
          ])
        }
      >
        Open skill
      </button>
    </div>
  );
};

const PROJECT = 'my-project';

const renderRoutes = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <ProjectsContext.Provider
        value={{
          projects: [mockProjectK8sResource({ k8sName: PROJECT, displayName: PROJECT })],
          modelServingProjects: [],
          nonActiveProjects: [],
          preferredProject: null,
          updatePreferredProject: () => undefined,
          waitForProject: () => Promise.resolve(),
          loaded: true,
          loadError: undefined,
        }}
      >
        <Routes>
          <Route path="/ai-hub/skills/*" element={<GlobalMLflowSkillRegistryRoutes />} />
        </Routes>
      </ProjectsContext.Provider>
    </MemoryRouter>,
  );

describe('GlobalMLflowSkillRegistryRoutes', () => {
  beforeEach(() => {
    jest.mocked(loadRemote).mockResolvedValue({ default: FakeSkillRegistry });
  });

  it('should mount the MLflow Skill Registry under the Skills base path on a skill URL', async () => {
    renderRoutes(`/ai-hub/skills/@acme/code-review?workspace=${PROJECT}`);

    const remote = await screen.findByTestId('fake-skill-registry');
    expect(remote).toHaveAttribute('data-basename', '/ai-hub/skills');
    expect(screen.getByTestId('fake-skill-registry-location')).toHaveTextContent(
      `/ai-hub/skills/@acme/code-review?workspace=${PROJECT}`,
    );
    expect(screen.getByTestId('app-page-title')).toHaveTextContent('Skills');
    expect(loadRemote).toHaveBeenCalledWith('mlflowEmbedded/MlflowSkillRegistryWrapper');
  });

  it('should replace the page header with the breadcrumb the remote reports', async () => {
    renderRoutes(`/ai-hub/skills/@acme/code-review?workspace=${PROJECT}`);

    fireEvent.click(await screen.findByRole('button', { name: 'Open skill' }));

    expect(screen.queryByTestId('app-page-title')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skills' })).toHaveAttribute(
      'href',
      `/ai-hub/skills/?workspace=${PROJECT}`,
    );
    expect(screen.getByTestId('mlflow-breadcrumb-active')).toHaveTextContent('@acme/code-review');
  });

  it('should add the default project to a skill URL without one and keep the version', async () => {
    renderRoutes('/ai-hub/skills/code-review?version=2');

    expect(await screen.findByTestId('fake-skill-registry-location')).toHaveTextContent(
      `/ai-hub/skills/code-review?version=2&workspace=${PROJECT}`,
    );
  });
});
