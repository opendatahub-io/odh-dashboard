import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { mockRoleK8sResource, mockProjectK8sResource } from '#~/__mocks__';
import { useAccessReview } from '#~/api/useAccessReview';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import CreateRolePage from '#~/pages/projects/projectRoles/CreateRolePage';

jest.mock('#~/api/useAccessReview');
jest.mock('#~/api', () => ({
  createRole: jest.fn(),
  updateRole: jest.fn(),
}));
jest.mock('#~/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
  fireLinkTrackingEvent: jest.fn(),
}));
jest.mock('@odh-dashboard/ui-core/components/K8sNameDescriptionField', () => ({
  useK8sNameDescriptionFieldData: () => ({
    data: {
      name: '',
      k8sName: {
        value: '',
        state: { touched: false, invalidCharacters: false, invalidLength: false },
      },
      description: '',
    },
    onDataChange: jest.fn(),
  }),
}));

jest.mock('../CreateRoleForm', () => {
  const Mock = () => <div data-testid="create-role-form" />;
  Mock.displayName = 'MockCreateRoleForm';
  return Mock;
});

jest.mock('../CreateRoleFooter', () => {
  const Mock = () => <div data-testid="create-role-footer" />;
  Mock.displayName = 'MockCreateRoleFooter';
  return Mock;
});

jest.mock('../CreateRoleYamlView', () => {
  const Mock = () => null;
  Mock.displayName = 'MockCreateRoleYamlView';
  return Mock;
});

jest.mock('../CreateRoleConfirmModal', () => {
  const Mock = () => null;
  Mock.displayName = 'MockCreateRoleConfirmModal';
  return Mock;
});

jest.mock('../ReplaceContentConfirmModal', () => {
  const Mock = () => null;
  Mock.displayName = 'MockReplaceContentConfirmModal';
  return Mock;
});

jest.mock('../SelectTemplateModal', () => {
  const Mock = () => null;
  Mock.displayName = 'MockSelectTemplateModal';
  return Mock;
});

const mockUseAccessReview = jest.mocked(useAccessReview);

const mockProject = mockProjectK8sResource({ k8sName: 'test-project' });

const contextValue = {
  currentProject: mockProject,
  refreshAllProjectData: jest.fn(),
} as unknown as React.ContextType<typeof ProjectDetailsContext>;

const renderPage = (props: React.ComponentProps<typeof CreateRolePage> = {}) =>
  render(
    <MemoryRouter initialEntries={['/projects/test-project/roles/create']}>
      <Routes>
        <Route
          path="/projects/:namespace/roles/create"
          element={
            <ProjectDetailsContext.Provider value={contextValue}>
              <CreateRolePage {...props} />
            </ProjectDetailsContext.Provider>
          }
        />
        <Route path="/projects/:namespace" element={<div data-testid="redirected" />} />
      </Routes>
    </MemoryRouter>,
  );

describe('CreateRolePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccessReview.mockReturnValue([true, true]);
  });

  it('should render "Create custom role" as page title in create mode', () => {
    renderPage();
    expect(screen.getByTestId('app-page-title')).toHaveTextContent('Create custom role');
  });

  it('should render "Edit custom role" as page title in edit mode', () => {
    const existingRole = mockRoleK8sResource({
      name: 'my-custom-role',
      namespace: 'test-project',
    });
    renderPage({ existingRole });
    expect(screen.getByTestId('app-page-title')).toHaveTextContent('Edit custom role');
  });

  it('should render "Duplicate custom role" as page title in duplicate mode', () => {
    const duplicateRole = mockRoleK8sResource({
      name: '',
      namespace: 'test-project',
    });
    renderPage({ duplicateRole });
    expect(screen.getByTestId('app-page-title')).toHaveTextContent('Duplicate custom role');
  });

  it('should render the create role page when user has permission', () => {
    renderPage();
    expect(screen.getByTestId('create-role-page')).toBeInTheDocument();
  });

  it('should render the form and footer sections', () => {
    renderPage();
    expect(screen.getByTestId('create-role-form')).toBeInTheDocument();
    expect(screen.getByTestId('create-role-footer')).toBeInTheDocument();
  });

  it('should render select role template button', () => {
    renderPage();
    expect(screen.getByTestId('select-role-template-button')).toBeInTheDocument();
  });

  it('should show loading spinner while access review is loading', () => {
    mockUseAccessReview.mockReturnValue([false, false]);
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('create-role-page')).not.toBeInTheDocument();
  });

  it('should redirect when user lacks create permission', () => {
    mockUseAccessReview.mockReturnValue([false, true]);
    renderPage();
    expect(screen.queryByTestId('create-role-page')).not.toBeInTheDocument();
    expect(screen.getByTestId('redirected')).toBeInTheDocument();
  });
});
