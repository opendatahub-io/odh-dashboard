import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import ProjectSelectorField from '../ProjectSelectorField';

jest.mock('@odh-dashboard/internal/concepts/projects/ProjectSelector', () => {
  function MockProjectSelector(props: {
    namespace: string;
    onSelection: (projectName: string) => void;
    isLoading?: boolean;
  }) {
    return (
      <div data-testid="project-selector">
        <span data-testid="selected-namespace">{props.namespace}</span>
        {props.isLoading && <span data-testid="selector-loading">Loading</span>}
        <button
          type="button"
          data-testid="select-project-btn"
          onClick={() => props.onSelection('new-project')}
        >
          select
        </button>
      </div>
    );
  }
  return MockProjectSelector;
});

const mockProject = mockProjectK8sResource({
  k8sName: 'test-project',
  displayName: 'Test Project',
});

const defaultContextValue = {
  projects: [mockProject],
  modelServingProjects: [],
  nonActiveProjects: [],
  preferredProject: null,
  updatePreferredProject: jest.fn(),
  loaded: true,
  loadError: undefined,
  waitForProject: () => Promise.resolve(),
};

const renderComponent = (
  props: Partial<React.ComponentProps<typeof ProjectSelectorField>> = {},
  contextOverrides: Partial<typeof defaultContextValue> = {},
) =>
  render(
    <ProjectsContext.Provider value={{ ...defaultContextValue, ...contextOverrides }}>
      <ProjectSelectorField selectedNamespace="" onSelect={jest.fn()} {...props} />
    </ProjectsContext.Provider>,
  );

describe('ProjectSelectorField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with "Project" label and required marker', () => {
    renderComponent();
    expect(screen.getByTestId('namespace-form-group')).toBeInTheDocument();
    expect(screen.getByText('Project')).toBeInTheDocument();
  });

  it('should render the project selector', () => {
    renderComponent({ selectedNamespace: 'my-ns' });
    expect(screen.getByTestId('project-selector')).toBeInTheDocument();
    expect(screen.getByTestId('selected-namespace')).toHaveTextContent('my-ns');
  });

  it('should show loading text when projects are not loaded', () => {
    renderComponent({}, { loaded: false });
    expect(screen.getByText('Loading projects...')).toBeInTheDocument();
  });

  it('should show "Checking access..." when a namespace is selected and isLoading is true', () => {
    renderComponent({ selectedNamespace: 'my-ns', isLoading: true });
    expect(screen.getByText('Checking access...')).toBeInTheDocument();
  });

  it('should not show "Checking access..." when no namespace is selected', () => {
    renderComponent({ selectedNamespace: '', isLoading: true });
    expect(screen.queryByText('Checking access...')).not.toBeInTheDocument();
  });

  it('should show no-access warning when hasAccess is false', () => {
    renderComponent({ selectedNamespace: 'my-ns', hasAccess: false });
    expect(screen.getByTestId('namespace-registry-access-alert')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The selected project does not have access to this model registry. Contact your administrator to grant access.',
      ),
    ).toBeInTheDocument();
  });

  it('should not show no-access warning when hasAccess is true', () => {
    renderComponent({ selectedNamespace: 'my-ns', hasAccess: true });
    expect(screen.queryByTestId('namespace-registry-access-alert')).not.toBeInTheDocument();
  });

  it('should not show no-access warning while loading', () => {
    renderComponent({ selectedNamespace: 'my-ns', hasAccess: false, isLoading: true });
    expect(screen.queryByTestId('namespace-registry-access-alert')).not.toBeInTheDocument();
  });

  it('should show cannot-check info alert when cannotCheck is true', () => {
    renderComponent({
      selectedNamespace: 'my-ns',
      cannotCheck: true,
      registryName: 'my-registry',
    });
    const alert = screen.getByTestId('namespace-registry-cannot-check-alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(
      'Make sure this project has access to the my-registry registry before proceeding',
    );
  });

  it('should not show cannot-check alert while loading', () => {
    renderComponent({
      selectedNamespace: 'my-ns',
      isLoading: true,
      cannotCheck: true,
      registryName: 'my-registry',
    });
    expect(screen.queryByTestId('namespace-registry-cannot-check-alert')).not.toBeInTheDocument();
  });

  it('should show error alert when error is provided', () => {
    renderComponent({
      selectedNamespace: 'my-ns',
      error: new Error('Something went wrong'),
    });
    const alert = screen.getByTestId('namespace-registry-access-error');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Something went wrong');
  });

  it('should show no-projects warning when projects list is empty', () => {
    renderComponent({}, { projects: [], loaded: true });
    expect(screen.getByTestId('namespace-registry-access-alert')).toBeInTheDocument();
    expect(screen.getByText(/You do not have access to any projects/)).toBeInTheDocument();
    expect(screen.getByTestId('who-is-my-admin-trigger')).toBeInTheDocument();
  });

  it('should call onSelect when a project is selected', () => {
    const onSelect = jest.fn();
    renderComponent({ onSelect });
    screen.getByTestId('select-project-btn').click();
    expect(onSelect).toHaveBeenCalledWith('new-project');
  });
});
