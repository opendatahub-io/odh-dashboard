import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import GlobalProjectSettings from '#~/pages/clusterSettings/GlobalProjectSettings';

const mockProjects = [
  mockProjectK8sResource({ k8sName: 'project-a', displayName: 'Project A' }),
  mockProjectK8sResource({ k8sName: 'project-b', displayName: 'Project B' }),
  mockProjectK8sResource({ k8sName: 'mlflow-ns', displayName: 'MLflow NS' }),
];

const renderComponent = (
  props: {
    selectedNamespace?: string;
    setSelectedNamespace?: jest.Mock;
  } = {},
) => {
  const { selectedNamespace = '', setSelectedNamespace = jest.fn() } = props;

  return render(
    <ProjectsContext.Provider
      value={{
        projects: mockProjects,
        modelServingProjects: [],
        nonActiveProjects: [],
        preferredProject: null,
        updatePreferredProject: () => undefined,
        loaded: true,
        loadError: undefined,
        waitForProject: () => Promise.resolve(),
      }}
    >
      <GlobalProjectSettings
        selectedNamespace={selectedNamespace}
        setSelectedNamespace={setSelectedNamespace}
      />
    </ProjectsContext.Provider>,
  );
};

describe('GlobalProjectSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the section title and description', () => {
    renderComponent();
    expect(screen.getByText('Global project')).toBeInTheDocument();
    expect(
      screen.getByText('Select a project to store and share prompts globally.'),
    ).toBeInTheDocument();
  });

  it('should show "Select a project" when no namespace is selected', () => {
    renderComponent({ selectedNamespace: '' });
    expect(screen.getByTestId('project-selector-toggle')).toHaveTextContent('Select a project');
  });

  it('should display the currently selected namespace', () => {
    renderComponent({ selectedNamespace: 'mlflow-ns' });
    expect(screen.getByTestId('project-selector-toggle')).toHaveTextContent('MLflow NS');
  });

  it('should call setSelectedNamespace directly for first-time selection (no modal)', () => {
    const setSelectedNamespace = jest.fn();
    renderComponent({ selectedNamespace: '', setSelectedNamespace });
    fireEvent.click(screen.getByTestId('project-selector-toggle'));
    fireEvent.click(screen.getByText('Project A'));
    expect(setSelectedNamespace).toHaveBeenCalledWith('project-a');
    expect(screen.queryByTestId('global-project-warning-modal')).not.toBeInTheDocument();
  });

  describe('warning modal on clear', () => {
    it('should show the clear warning modal when clearing a selected project', () => {
      renderComponent({ selectedNamespace: 'mlflow-ns' });
      fireEvent.click(screen.getByTestId('project-selector-toggle'));
      fireEvent.click(screen.getByText('Clear selection'));
      expect(screen.getByTestId('global-project-warning-modal')).toBeInTheDocument();
      expect(screen.getByText('Clear the global project?')).toBeInTheDocument();
    });

    it('should apply the clear when confirmed', () => {
      const setSelectedNamespace = jest.fn();
      renderComponent({ selectedNamespace: 'mlflow-ns', setSelectedNamespace });
      fireEvent.click(screen.getByTestId('project-selector-toggle'));
      fireEvent.click(screen.getByText('Clear selection'));
      fireEvent.click(screen.getByTestId('global-project-warning-confirm'));
      expect(setSelectedNamespace).toHaveBeenCalledWith('');
      expect(screen.queryByTestId('global-project-warning-modal')).not.toBeInTheDocument();
    });

    it('should not apply the clear when cancelled', () => {
      const setSelectedNamespace = jest.fn();
      renderComponent({ selectedNamespace: 'mlflow-ns', setSelectedNamespace });
      fireEvent.click(screen.getByTestId('project-selector-toggle'));
      fireEvent.click(screen.getByText('Clear selection'));
      fireEvent.click(screen.getByTestId('global-project-warning-cancel'));
      expect(setSelectedNamespace).not.toHaveBeenCalled();
      expect(screen.queryByTestId('global-project-warning-modal')).not.toBeInTheDocument();
    });
  });

  describe('warning modal on switch', () => {
    it('should show the switch warning modal when changing to a different project', () => {
      renderComponent({ selectedNamespace: 'mlflow-ns' });
      fireEvent.click(screen.getByTestId('project-selector-toggle'));
      fireEvent.click(screen.getByText('Project A'));
      expect(screen.getByTestId('global-project-warning-modal')).toBeInTheDocument();
      expect(screen.getByText('Change the global project?')).toBeInTheDocument();
    });

    it('should apply the switch when confirmed', () => {
      const setSelectedNamespace = jest.fn();
      renderComponent({ selectedNamespace: 'mlflow-ns', setSelectedNamespace });
      fireEvent.click(screen.getByTestId('project-selector-toggle'));
      fireEvent.click(screen.getByText('Project A'));
      fireEvent.click(screen.getByTestId('global-project-warning-confirm'));
      expect(setSelectedNamespace).toHaveBeenCalledWith('project-a');
      expect(screen.queryByTestId('global-project-warning-modal')).not.toBeInTheDocument();
    });

    it('should not apply the switch when cancelled', () => {
      const setSelectedNamespace = jest.fn();
      renderComponent({ selectedNamespace: 'mlflow-ns', setSelectedNamespace });
      fireEvent.click(screen.getByTestId('project-selector-toggle'));
      fireEvent.click(screen.getByText('Project A'));
      fireEvent.click(screen.getByTestId('global-project-warning-cancel'));
      expect(setSelectedNamespace).not.toHaveBeenCalled();
      expect(screen.queryByTestId('global-project-warning-modal')).not.toBeInTheDocument();
    });
  });

  it('should not show an All projects option', () => {
    renderComponent({ selectedNamespace: '' });
    fireEvent.click(screen.getByTestId('project-selector-toggle'));
    expect(screen.queryByText('All projects')).not.toBeInTheDocument();
  });

  it('should not show modal when selecting the same project', () => {
    const setSelectedNamespace = jest.fn();
    renderComponent({ selectedNamespace: 'project-a', setSelectedNamespace });
    fireEvent.click(screen.getByTestId('project-selector-toggle'));
    const menuItems = screen.getAllByText('Project A');
    fireEvent.click(menuItems[menuItems.length - 1]);
    expect(screen.queryByTestId('global-project-warning-modal')).not.toBeInTheDocument();
    expect(setSelectedNamespace).toHaveBeenCalledWith('project-a');
  });
});
