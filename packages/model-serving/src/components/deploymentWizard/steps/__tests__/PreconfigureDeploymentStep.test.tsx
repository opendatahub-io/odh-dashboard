import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { PreconfigureDeploymentStepContent } from '../PreconfigureDeploymentStep';
import { mockDeploymentWizardState } from '../../../../__tests__/mockUtils';

const mockProject = mockProjectK8sResource({
  k8sName: 'test-project',
  displayName: 'Test Project',
});

const createProjectsContextValue = () => ({
  projects: [mockProject],
  loaded: true,
  preferredProject: null,
  modelServingProjects: [],
  nonActiveProjects: [],
  updatePreferredProject: () => undefined,
  waitForProject: () => Promise.resolve(),
  loadError: undefined,
});

const mockWizardStateWithoutProject = (setProjectName = jest.fn()) => {
  const state = mockDeploymentWizardState();
  state.state.project = {
    initialProjectName: undefined,
    projectName: undefined,
    setProjectName,
  };
  return state;
};

describe('PreconfigureDeploymentStep', () => {
  it('should render the description text', () => {
    const wizardState = mockWizardStateWithoutProject();

    render(
      <MemoryRouter>
        <ProjectsContext.Provider value={createProjectsContextValue()}>
          <PreconfigureDeploymentStepContent wizardState={wizardState} />
        </ProjectsContext.Provider>
      </MemoryRouter>,
    );

    expect(
      screen.getByText('Choose from the below options to configure your deployment.'),
    ).toBeInTheDocument();
  });

  it('should render a project selector when no initial project is set', () => {
    const wizardState = mockWizardStateWithoutProject();

    render(
      <MemoryRouter>
        <ProjectsContext.Provider value={createProjectsContextValue()}>
          <PreconfigureDeploymentStepContent wizardState={wizardState} />
        </ProjectsContext.Provider>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('project-selector-toggle')).toBeInTheDocument();
  });

  it('should call setProjectName when a project is selected', () => {
    const mockSetProjectName = jest.fn();
    const wizardState = mockWizardStateWithoutProject(mockSetProjectName);

    render(
      <MemoryRouter>
        <ProjectsContext.Provider value={createProjectsContextValue()}>
          <PreconfigureDeploymentStepContent wizardState={wizardState} />
        </ProjectsContext.Provider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('project-selector-toggle'));
    fireEvent.click(screen.getByText('Test Project'));

    expect(mockSetProjectName).toHaveBeenCalledWith('test-project');
  });

  it('should render a disabled text input when initial project is set', () => {
    const wizardState = mockDeploymentWizardState();

    render(
      <MemoryRouter>
        <ProjectsContext.Provider value={createProjectsContextValue()}>
          <PreconfigureDeploymentStepContent wizardState={wizardState} />
        </ProjectsContext.Provider>
      </MemoryRouter>,
    );

    const input = screen.getByTestId('preconfigure-project-name');
    expect(input).toBeDisabled();
    expect(input).toHaveValue('test-project');
  });
});
