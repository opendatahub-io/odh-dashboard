import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
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

  it('should call setSelectedNamespace when a project is selected', () => {
    const setSelectedNamespace = jest.fn();
    renderComponent({ selectedNamespace: '', setSelectedNamespace });
    fireEvent.click(screen.getByTestId('project-selector-toggle'));
    fireEvent.click(screen.getByText('Project A'));
    expect(setSelectedNamespace).toHaveBeenCalledWith('project-a');
  });

  it('should call setSelectedNamespace with empty string when None is selected', () => {
    const setSelectedNamespace = jest.fn();
    renderComponent({ selectedNamespace: 'mlflow-ns', setSelectedNamespace });
    fireEvent.click(screen.getByTestId('project-selector-toggle'));
    fireEvent.click(screen.getByText('None'));
    expect(setSelectedNamespace).toHaveBeenCalledWith('');
  });

  it('should not show an All projects option', () => {
    renderComponent({ selectedNamespace: '' });
    fireEvent.click(screen.getByTestId('project-selector-toggle'));
    expect(screen.queryByText('All projects')).not.toBeInTheDocument();
  });
});
