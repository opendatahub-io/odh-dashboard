import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAccessReview } from '@odh-dashboard/plugin-core/host-api';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import ProjectRoles from '#~/pages/projects/projectRoles/ProjectRoles';

jest.mock('@odh-dashboard/plugin-core/host-api');
const mockUseAccessReview = jest.mocked(useAccessReview);

jest.mock('#~/concepts/permissions/PermissionsContext', () => ({
  usePermissionsContext: jest.fn(() => ({
    roles: { data: [], loaded: true, error: undefined, refresh: jest.fn() },
    clusterRoles: { data: [], loaded: true, error: undefined, refresh: jest.fn() },
    roleBindings: { data: [], loaded: true, error: undefined, refresh: jest.fn() },
    loaded: true,
    error: undefined,
  })),
}));

jest.mock('#~/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
  fireLinkTrackingEvent: jest.fn(),
}));

const mockProject = mockProjectK8sResource({ k8sName: 'test-project' });

const contextValue = {
  currentProject: mockProject,
  refreshAllProjectData: jest.fn(),
} as unknown as React.ContextType<typeof ProjectDetailsContext>;

const renderProjectRoles = () =>
  render(
    <MemoryRouter initialEntries={['/projects/test-project?section=roles']}>
      <Routes>
        <Route
          path="/projects/:namespace"
          element={
            <ProjectDetailsContext.Provider value={contextValue}>
              <ProjectRoles />
            </ProjectDetailsContext.Provider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe('ProjectRoles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccessReview.mockReturnValue([true, true]);
  });

  it('should render the tab title, description, and link to the Permissions tab', () => {
    renderProjectRoles();

    expect(screen.getByTestId('roles-tab-title')).toHaveTextContent('Roles');
    expect(screen.getByTestId('roles-tab-description')).toHaveTextContent(
      'Create and manage roles for this project',
    );
    const permissionsLink = screen.getByTestId('roles-tab-permissions-link');
    expect(permissionsLink).toHaveAttribute('href', '/projects/test-project?section=permissions');
  });

  it('should navigate to the Permissions tab when clicking the Permissions link', () => {
    renderProjectRoles();

    const permissionsLink = screen.getByTestId('roles-tab-permissions-link');
    expect(permissionsLink).toHaveTextContent('Permissions');
    expect(permissionsLink.closest('a')).toHaveAttribute(
      'href',
      '/projects/test-project?section=permissions',
    );
  });
});
