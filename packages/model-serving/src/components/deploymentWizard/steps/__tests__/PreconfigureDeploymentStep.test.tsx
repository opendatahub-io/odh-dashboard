import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockToolCallingValidatedConfiguration } from '@odh-dashboard/internal/__mocks__/mockValidatedConfigurations';
import { PreconfigureDeploymentStepContent } from '../PreconfigureDeploymentStep';
import { mockDeploymentWizardState } from '../../../../__tests__/mockUtils';
import { ModelServingTrackingEvent } from '../../../../shared/tracking/modelServingTrackingConstants';

const mockTrackEvent = jest.fn();
jest.mock('@odh-dashboard/plugin-core/host-api', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/host-api'),
  useTrackEvent: () => mockTrackEvent,
}));

const mockProject = mockProjectK8sResource({
  k8sName: 'test-project',
  displayName: 'Test Project',
});

const CATALOG_NAV_STATE = {
  fromCatalog: true,
  catalogModelId: 'test-catalog-model',
};

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

const renderStep = (
  wizardState: ReturnType<typeof mockDeploymentWizardState>,
  locationState: object = {},
) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/', state: locationState }]}>
      <ProjectsContext.Provider value={createProjectsContextValue()}>
        <PreconfigureDeploymentStepContent wizardState={wizardState} />
      </ProjectsContext.Provider>
    </MemoryRouter>,
  );

describe('PreconfigureDeploymentStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the description text', () => {
    const wizardState = mockWizardStateWithoutProject();

    renderStep(wizardState);

    expect(
      screen.getByText('Choose from the below options to configure your deployment.'),
    ).toBeInTheDocument();
  });

  it('should render a project selector when no initial project is set', () => {
    const wizardState = mockWizardStateWithoutProject();

    renderStep(wizardState);

    expect(screen.getByTestId('project-selector-toggle')).toBeInTheDocument();
  });

  it('should call setProjectName when a project is selected', () => {
    const mockSetProjectName = jest.fn();
    const wizardState = mockWizardStateWithoutProject(mockSetProjectName);

    renderStep(wizardState);

    fireEvent.click(screen.getByTestId('project-selector-toggle'));
    fireEvent.click(screen.getByText('Test Project'));

    expect(mockSetProjectName).toHaveBeenCalledWith('test-project');
  });

  it('should render a disabled text input when initial project is set', () => {
    const wizardState = mockDeploymentWizardState();

    renderStep(wizardState);

    const input = screen.getByTestId('preconfigure-project-name');
    expect(input).toBeDisabled();
    expect(input).toHaveValue('test-project');
  });

  it('should not render validated arguments when validatedConfigurations is empty', () => {
    const wizardState = mockWizardStateWithoutProject();

    renderStep(wizardState, CATALOG_NAV_STATE);

    expect(screen.queryByTestId('validated-configuration-section-args')).not.toBeInTheDocument();
  });

  it('should render validated arguments when configs have options regardless of catalog nav state', () => {
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

    renderStep(wizardState);

    expect(screen.getByTestId('validated-configuration-section-args')).toBeInTheDocument();
  });

  it('should render validated arguments section when validatedConfigurations is provided from catalog', () => {
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

    renderStep(wizardState, CATALOG_NAV_STATE);

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
    const setRuntimeArgs = jest.fn();
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
        runtimeArgs: {
          data: { enabled: false, args: [] },
          setData: setRuntimeArgs,
        },
        validatedConfigurationSelection: {
          selectedValidatedConfigurations: {},
          toggleOption,
          isOptionSelected: jest.fn().mockReturnValue(false),
        },
      },
    });

    renderStep(wizardState, CATALOG_NAV_STATE);

    fireEvent.click(screen.getByTestId('validated-configuration-option-checkbox-tool-calling'));

    expect(toggleOption).toHaveBeenCalledWith(
      'args',
      mockToolCallingValidatedConfiguration().options[0].value,
      true,
    );
    expect(setRuntimeArgs).toHaveBeenCalledTimes(1);
    expect(typeof setRuntimeArgs.mock.calls[0][0]).toBe('function');
    expect(setRuntimeArgs.mock.calls[0][0]({ enabled: false, args: [] })).toEqual({
      enabled: true,
      args: [
        '# Validated arguments for Tool calling',
        '--enable-auto-tool-choice',
        '--tool-call-parser hermes',
        '--chat-template /etc/vllm/templates/tool_chat_template_hermes.jinja',
      ],
    });
    expect(mockTrackEvent).toHaveBeenCalledWith(
      ModelServingTrackingEvent.VALIDATED_ARGUMENT_SELECTED,
      {
        configurationName: 'Tool calling',
        configurationIcon: 'tool-calling',
        isSelected: true,
        catalogModelId: 'test-catalog-model',
        entryPoint: 'model_details',
        hasValidatedArgumentsSection: true,
      },
    );
  });

  it('should remove validated runtime args when unchecking a configuration', () => {
    const toggleOption = jest.fn();
    const setRuntimeArgs = jest.fn();
    const option = mockToolCallingValidatedConfiguration().options[0];
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
        runtimeArgs: {
          data: {
            enabled: true,
            args: [
              '# Validated arguments for Tool calling',
              '--enable-auto-tool-choice',
              '--tool-call-parser hermes',
              '--chat-template /etc/vllm/templates/tool_chat_template_hermes.jinja',
              '--user-arg',
            ],
          },
          setData: setRuntimeArgs,
        },
        validatedConfigurationSelection: {
          selectedValidatedConfigurations: { args: [option.value] },
          toggleOption,
          isOptionSelected: jest.fn().mockReturnValue(true),
        },
      },
    });

    renderStep(wizardState, CATALOG_NAV_STATE);

    fireEvent.click(screen.getByTestId('validated-configuration-option-checkbox-tool-calling'));

    expect(toggleOption).toHaveBeenCalledWith('args', option.value, false);
    expect(setRuntimeArgs.mock.calls[0][0](wizardState.state.runtimeArgs.data)).toEqual({
      enabled: true,
      args: ['--user-arg'],
    });
    expect(mockTrackEvent).toHaveBeenCalledWith(
      ModelServingTrackingEvent.VALIDATED_ARGUMENT_SELECTED,
      expect.objectContaining({ isSelected: false, configurationName: 'Tool calling' }),
    );
  });

  it('should fire viewed tracking when View arguments is clicked', () => {
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

    renderStep(wizardState, CATALOG_NAV_STATE);

    const viewArgumentsButton = screen.getByTestId(
      'validated-configuration-view-arguments-tool-calling',
    );
    fireEvent.click(viewArgumentsButton);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      ModelServingTrackingEvent.VALIDATED_ARGUMENTS_VIEWED,
      {
        configurationName: 'Tool calling',
        catalogModelId: 'test-catalog-model',
        entryPoint: 'model_details',
        hasValidatedArgumentsSection: true,
      },
    );

    fireEvent.click(viewArgumentsButton);

    expect(
      mockTrackEvent.mock.calls.filter(
        ([eventName]) => eventName === ModelServingTrackingEvent.VALIDATED_ARGUMENTS_VIEWED,
      ),
    ).toHaveLength(1);
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

    renderStep(wizardState, CATALOG_NAV_STATE);

    expect(
      screen.queryByTestId('validated-configuration-option-tool-calling'),
    ).not.toBeInTheDocument();
  });
});
