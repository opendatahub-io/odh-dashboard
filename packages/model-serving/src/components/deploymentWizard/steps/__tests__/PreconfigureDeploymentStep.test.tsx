import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockToolCallingValidatedConfiguration } from '@odh-dashboard/internal/__mocks__/mockValidatedConfigurations';
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

  it('should not render validated arguments when validatedConfigurations is empty', () => {
    const wizardState = mockWizardStateWithoutProject();

    render(
      <MemoryRouter>
        <ProjectsContext.Provider value={createProjectsContextValue()}>
          <PreconfigureDeploymentStepContent wizardState={wizardState} />
        </ProjectsContext.Provider>
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('validated-configuration-section-args')).not.toBeInTheDocument();
  });

  it('should render validated arguments section when validatedConfigurations is provided', () => {
    const wizardState = mockDeploymentWizardState({
      initialData: {
        validatedConfigurations: [mockToolCallingValidatedConfiguration()],
      },
      state: {
        project: {
          initialProjectName: undefined,
          projectName: undefined,
          setProjectName: jest.fn(),
        },
      },
    });

    render(
      <MemoryRouter>
        <ProjectsContext.Provider value={createProjectsContextValue()}>
          <PreconfigureDeploymentStepContent wizardState={wizardState} />
        </ProjectsContext.Provider>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('validated-configuration-section-args')).toBeInTheDocument();
    expect(screen.getByText('Validated arguments')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This model has runtime configurations that have been tested and validated by Red Hat. Selected configurations will be applied as runtime arguments in your deployment.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('validated-configuration-option-tool-calling')).toBeInTheDocument();
  });

  it('should toggle validated configuration selection via wizard state', () => {
    const toggleOption = jest.fn();
    const wizardState = mockDeploymentWizardState({
      initialData: {
        validatedConfigurations: [mockToolCallingValidatedConfiguration()],
      },
      state: {
        project: {
          initialProjectName: undefined,
          projectName: undefined,
          setProjectName: jest.fn(),
        },
        validatedConfigurationSelection: {
          selectedValidatedConfigurations: {},
          toggleOption,
          isOptionSelected: jest.fn().mockReturnValue(false),
        },
      },
    });

    render(
      <MemoryRouter>
        <ProjectsContext.Provider value={createProjectsContextValue()}>
          <PreconfigureDeploymentStepContent wizardState={wizardState} />
        </ProjectsContext.Provider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('validated-configuration-option-checkbox-tool-calling'));

    expect(toggleOption).toHaveBeenCalledWith(
      'args',
      mockToolCallingValidatedConfiguration().options[0].value,
      true,
    );
  });

  it('should not render any card when validatedConfigurations has no options for a field', () => {
    // Simulates the upstream data producer (e.g. model catalog) omitting the tool-calling
    // option entirely because the toolCalling feature flag was disabled or the model has no
    // validated tool-calling config — the wizard step never needs to know why.
    const wizardState = mockDeploymentWizardState({
      initialData: {
        validatedConfigurations: [
          {
            ...mockToolCallingValidatedConfiguration(),
            options: [],
          },
        ],
      },
      state: {
        project: {
          initialProjectName: undefined,
          projectName: undefined,
          setProjectName: jest.fn(),
        },
      },
    });

    render(
      <MemoryRouter>
        <ProjectsContext.Provider value={createProjectsContextValue()}>
          <PreconfigureDeploymentStepContent wizardState={wizardState} />
        </ProjectsContext.Provider>
      </MemoryRouter>,
    );

    expect(
      screen.queryByTestId('validated-configuration-option-tool-calling'),
    ).not.toBeInTheDocument();
  });
});
