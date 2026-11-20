import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import {
  ProjectsContext,
  type ProjectsContextType,
} from '@odh-dashboard/ui-core/context/ProjectsContext';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { ModelDeploymentWizardPage } from '../ModelDeploymentWizardPage';

jest.mock('../ModelDeploymentWizard', () => ({
  __esModule: true,
  default: ({ project }: { project?: ProjectKind }) => (
    <div data-testid="wizard-project">{project?.metadata.name ?? 'none'}</div>
  ),
}));
jest.mock('../../../concepts/ModelDeploymentsContext', () => ({
  ModelDeploymentsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('../../../concepts/useAvailableClusterPlatforms', () => ({
  useAvailableClusterPlatforms: () => ({
    clusterPlatforms: [],
    clusterPlatformsLoaded: true,
    clusterPlatformsError: undefined,
  }),
}));
jest.mock('../../../concepts/useProjectServingPlatform', () => ({
  useProjectServingPlatform: () => ({ activePlatform: undefined }),
}));

const deployer = mockProjectK8sResource({ k8sName: 'deployer', displayName: 'Deployer' });
const viewer = mockProjectK8sResource({ k8sName: 'viewer', displayName: 'Viewer' });

const contextValue = (overrides: Partial<ProjectsContextType> = {}): ProjectsContextType => ({
  projects: [deployer, viewer],
  modelServingProjects: [deployer, viewer],
  nonActiveProjects: [],
  preferredProject: null,
  updatePreferredProject: () => undefined,
  waitForProject: () => Promise.resolve(),
  loaded: true,
  loadError: undefined,
  ...overrides,
});

const renderPage = (state: Record<string, unknown>, value: ProjectsContextType) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/deploy', state }]}>
      <ProjectsContext.Provider value={value}>
        <ModelDeploymentWizardPage />
      </ProjectsContext.Provider>
    </MemoryRouter>,
  );

describe('ModelDeploymentWizardPage', () => {
  it('should not adopt a navigation-supplied project the caller cannot deploy to', () => {
    renderPage({ projectName: 'viewer' }, contextValue({ deploymentTargetProjects: [deployer] }));
    expect(screen.getByTestId('wizard-project')).toHaveTextContent('none');
  });

  it('should adopt a navigation-supplied deploy target', () => {
    renderPage({ projectName: 'deployer' }, contextValue({ deploymentTargetProjects: [deployer] }));
    expect(screen.getByTestId('wizard-project')).toHaveTextContent('deployer');
  });

  it('should edit an existing deployment in its project even without deploy targets there', () => {
    renderPage(
      { projectName: 'viewer', existingDeployment: { model: {} } },
      contextValue({ deploymentTargetProjects: [deployer] }),
    );
    expect(screen.getByTestId('wizard-project')).toHaveTextContent('viewer');
  });

  it('should treat every project as a target when the host sets no subset', () => {
    renderPage({ projectName: 'viewer' }, contextValue());
    expect(screen.getByTestId('wizard-project')).toHaveTextContent('viewer');
  });
});
