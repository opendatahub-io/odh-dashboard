import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  ProjectsContext,
  type ProjectsContextType,
} from '@odh-dashboard/ui-core/context/ProjectsContext';
import NoProjectsPage from '../NoProjectsPage';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));
jest.mock('../NewProjectButton', () => ({
  __esModule: true,
  default: () => <button data-testid="create-project">Create project</button>,
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

const renderPage = (value: ProjectsContextType) =>
  render(
    <ProjectsContext.Provider value={value}>
      <NoProjectsPage />
    </ProjectsContext.Provider>,
  );

describe('NoProjectsPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should only offer project creation where the host lists every project', () => {
    renderPage(context());
    expect(screen.getByText('To deploy a model, first create a project.')).toBeInTheDocument();
    expect(screen.queryByTestId('find-project-by-name')).not.toBeInTheDocument();
    expect(screen.getByTestId('create-project')).toBeInTheDocument();
  });

  it('should open a project the host verifies by name', async () => {
    const findProject = jest.fn(() =>
      Promise.resolve({ apiVersion: 'v1', kind: 'Namespace', metadata: { name: 'allowed' } }),
    );
    renderPage(context(findProject));
    fireEvent.change(screen.getByTestId('find-project-name-input'), {
      target: { value: ' allowed ' },
    });
    fireEvent.click(screen.getByTestId('find-project-submit'));
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/ai-hub/models/deployments/allowed'),
    );
    expect(findProject).toHaveBeenCalledWith('allowed', expect.any(AbortSignal));
  });

  it('should show why a lookup was refused and stay on the page', async () => {
    const findProject = jest.fn(() =>
      Promise.reject(new Error('No access to that project, or it does not exist.')),
    );
    renderPage(context(findProject));
    fireEvent.change(screen.getByTestId('find-project-name-input'), {
      target: { value: 'denied' },
    });
    fireEvent.click(screen.getByTestId('find-project-submit'));
    expect(await screen.findByTestId('find-project-error')).toHaveTextContent(
      'No access to that project, or it does not exist.',
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
