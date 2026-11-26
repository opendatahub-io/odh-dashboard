import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  ProjectsContext,
  type ProjectsContextType,
} from '@odh-dashboard/ui-core/context/ProjectsContext';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import ModelServingProjectSelection from '../ModelServingProjectSelection';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));
jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core'),
  ProjectSelectorNavigator: () => <div data-testid="project-selector" />,
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

const renderSelection = (value: ProjectsContextType) =>
  render(
    <ProjectsContext.Provider value={value}>
      <ModelServingProjectSelection getRedirectPath={(ns) => `/deployments/${ns}`} />
    </ProjectsContext.Provider>,
  );

describe('ModelServingProjectSelection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should offer only the selector where the host lists every project', () => {
    renderSelection(context());
    expect(screen.getByTestId('project-selector')).toBeInTheDocument();
    expect(screen.queryByTestId('open-project-by-name')).not.toBeInTheDocument();
  });

  it('should open another project by name while the listing is incomplete', async () => {
    const findProject = jest.fn(() =>
      Promise.resolve(mockProjectK8sResource({ k8sName: 'second' })),
    );
    renderSelection(context(findProject));
    fireEvent.click(screen.getByTestId('open-project-by-name'));
    fireEvent.change(await screen.findByTestId('find-project-name-input'), {
      target: { value: 'second' },
    });
    fireEvent.click(screen.getByTestId('find-project-submit'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/deployments/second'));
    expect(findProject).toHaveBeenCalledWith('second');
  });
});
