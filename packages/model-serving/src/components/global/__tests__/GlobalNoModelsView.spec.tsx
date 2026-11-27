import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  ProjectsContext,
  type ProjectsContextType,
} from '@odh-dashboard/ui-core/context/ProjectsContext';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { GlobalNoModelsView } from '../GlobalNoModelsView';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));
jest.mock('../../../components/deploy/DeployButton', () => ({
  DeployButton: () => <button data-testid="deploy-button">Deploy model</button>,
}));

const context = (findProject?: ProjectsContextType['findProject']): ProjectsContextType => ({
  projects: [],
  modelServingProjects: [],
  nonActiveProjects: [],
  preferredProject: null,
  updatePreferredProject: jest.fn(),
  waitForProject: jest.fn(),
  loaded: true,
  loadError: undefined,
  findProject,
});

const renderView = (
  value: ProjectsContextType,
  project?: ReturnType<typeof mockProjectK8sResource>,
) =>
  render(
    <ProjectsContext.Provider value={value}>
      <GlobalNoModelsView project={project} />
    </ProjectsContext.Provider>,
  );

describe('GlobalNoModelsView', () => {
  it('should only offer deploying where the host lists every project', () => {
    renderView(context());
    expect(screen.getByTestId('deploy-button')).toBeInTheDocument();
    expect(screen.queryByTestId('find-project-name-input')).not.toBeInTheDocument();
  });

  it('should also offer opening a project by name while the listing is incomplete', () => {
    renderView(context(jest.fn()));
    expect(screen.getByTestId('deploy-button')).toBeInTheDocument();
    expect(screen.getByTestId('find-project-name-input')).toBeInTheDocument();
  });

  it('should not offer the lookup inside a project', () => {
    renderView(context(jest.fn()), mockProjectK8sResource({}));
    expect(screen.queryByTestId('find-project-name-input')).not.toBeInTheDocument();
  });
});
